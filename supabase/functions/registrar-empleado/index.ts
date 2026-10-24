import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { cors, FalloRegistro, leerJsonLimitado, fotoJpeg, type RegistroGateway } from '../_shared/registro.ts';
import { validarRegistroEmpleado } from '../../../shared/registro-empleado.ts';

const responder = (body: unknown, status = 200) => Response.json(body, { status, headers: { ...cors, 'Cache-Control': 'no-store' } });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return responder({ mensaje: 'Método no permitido.' }, 405);
  
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !secret) return responder({ mensaje: 'El registro no está disponible en este momento.' }, 503);
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });


    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) throw new FalloRegistro('SESION', 'No estás autorizado para realizar esta acción.', 401);
    
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) throw new FalloRegistro('SESION', 'La sesión venció. Volvé a ingresar.', 401);
    
    const { data: perfil, error: perfilError } = await admin.from('usuarios').select('perfil, estado_registro').eq('auth_id', userData.user.id).maybeSingle();
    if (perfilError) throw perfilError;
    if (!perfil || !['dueño', 'supervisor'].includes(perfil.perfil) || perfil.estado_registro !== 'aceptado') {

      throw new FalloRegistro('PERMISO', 'Solo un dueño o supervisor aceptado puede registrar empleados.', 403);
    }

    const input = await leerJsonLimitado(request);
    const validacion = validarRegistroEmpleado(input);
    if (Object.keys(validacion.errores).length) throw new FalloRegistro('VALIDACION', 'Revisá los campos indicados.', 400, validacion.errores);

    const gateway: RegistroGateway = {
      async buscarDuplicado(datos: any) {
        const { data: correos, error: errorCorreo } = await admin.from('usuarios').select('id').ilike('correo', datos.correo.replace(/[\\%_]/g, '\\$&')).limit(1);
        if (errorCorreo) throw errorCorreo;
        if (correos?.length) return 'correo';
        const { data: dni, error: errorDni } = await admin.from('usuarios').select('id').eq('dni', datos.dni).limit(1);
        if (errorDni) throw errorDni;
        return dni?.length ? 'dni' : null;
      },
      async crearCuenta(datos: any) {
        const id = crypto.randomUUID();
        try {
          const { data, error } = await admin.auth.admin.createUser({
            id, email: datos.correo, password: datos.password, email_confirm: true,
            user_metadata: { nombres: datos.nombres, apellidos: datos.apellidos },
          });
          if (error) {
            if (error.code === 'email_exists' || error.code === 'user_already_exists') throw new FalloRegistro('DUPLICADO', 'Ya existe una cuenta con este correo.', 409, { correo: 'Ya existe una cuenta con este correo.' });
            if (error.code === 'weak_password') throw new FalloRegistro('PASSWORD', 'La contraseña no cumple los requisitos configurados.', 400, { password: 'Al menos 8 caracteres y una mayuscula.' });
            throw error;
          }
          if (!data.user || data.user.id !== id) throw new Error('AUTH_SIN_USUARIO');
          return id;
        } catch (error) {
          if (error instanceof FalloRegistro) throw error;
          try {
            const recuperada = await admin.auth.admin.getUserById(id);
            if (!recuperada.error && recuperada.data.user?.id === id) return id;
          } catch { }
          throw new FalloRegistro('RESULTADO_INCIERTO', 'No pudimos confirmar la creación de la cuenta.', 503);
        }
      },
      async subirFoto(ruta, foto) {
        const { error } = await admin.storage.from('foto_personal').upload(ruta, foto, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
      },
      async perfilExiste(authId) {
        const { data, error } = await admin.from('usuarios').select('id').eq('auth_id', authId).maybeSingle();
        if (error) throw error;
        return !!data;
      },
      async crearPerfil(authId, validacionDatos: any, ruta) {
        const { data: publicUrlData } = admin.storage.from('foto_personal').getPublicUrl(ruta);
        const { error } = await admin.from('usuarios').insert({
          auth_id: authId, 
          nombres: validacionDatos.nombres, 
          apellidos: validacionDatos.apellidos,
          dni: validacionDatos.dni, 
          cuil: validacionDatos.cuil, 
          correo: validacionDatos.correo, 
          foto_perfil: publicUrlData.publicUrl,
          perfil: validacionDatos.perfil, 
          estado_registro: 'aceptado',
        });
        if (error?.code === '23505') {
          throw new FalloRegistro('DUPLICADO', 'Revisá el DNI, CUIL o correo indicado, ya existen en el sistema.', 409);
        }
        if (error) throw error;
      },
      async borrarFoto(ruta) { const { error } = await admin.storage.from('foto_personal').remove([ruta]); if (error) throw error; },
      async borrarCuenta(id) { const { error } = await admin.auth.admin.deleteUser(id); if (error) throw error; },
      informarLimpiezaFallida(id) { console.error('REGISTRO_REQUIERE_REVISION', { authId: id }); },
    };

    let foto: Uint8Array;
    try { foto = fotoJpeg(validacion.datos.fotoBase64); }
    catch (error) {
      if (error instanceof FalloRegistro) error.campos = { fotoBase64: error.message };
      throw error;
    }
    const duplicado = await gateway.buscarDuplicado(validacion.datos);
    if (duplicado) throw new FalloRegistro('DUPLICADO', 'Ya existe un registro con esos datos.', 409, {
      [duplicado]: duplicado === 'correo' ? 'Ya existe una cuenta con este correo.' : 'Ya existe un cliente con este DNI o CUIL.',
    });

    let authId: string | undefined;
    let ruta: string | undefined;
    let guardandoPerfil = false;
    try {
      authId = await gateway.crearCuenta(validacion.datos);
      ruta = `perfil-${validacion.datos.dni}-${Date.now()}.jpg`;
      await gateway.subirFoto(ruta, foto);
      guardandoPerfil = true;
      await gateway.crearPerfil(authId, validacion.datos, ruta);
    } catch (error) {
      if (authId) {
        if (guardandoPerfil) {
          try { if (await gateway.perfilExiste(authId)) return responder({ ok: true, estado: 'aceptado' }, 201); }
          catch {
            gateway.informarLimpiezaFallida(authId);
            throw new FalloRegistro('RESULTADO_INCIERTO', 'No pudimos confirmar el resultado. Intentá ingresar antes de repetir el registro.', 503);
          }
        }
        const limpieza = await Promise.allSettled([
          ...(ruta ? [gateway.borrarFoto(ruta)] : []),
          gateway.borrarCuenta(authId),
        ]);
        if (limpieza.some((resultado) => resultado.status === 'rejected')) gateway.informarLimpiezaFallida(authId);
      }
      throw error;
    }
    
    return responder({ ok: true, estado: 'aceptado' }, 201);
  } catch (error) {
    if (error instanceof FalloRegistro) return responder({ ok: false, codigo: error.codigo, mensaje: error.message, campos: error.campos }, error.status);
    console.error('REGISTRO_FALLO_INTERNO', error);
    return responder({ ok: false, codigo: 'INTERNO', mensaje: 'No se pudo completar el registro. Intentá nuevamente más tarde.' }, 500);
  }
});

