import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { cors, FalloRegistro, leerJsonLimitado, registrarCliente, type RegistroGateway } from '../_shared/registro.ts';
import { validarRegistroCliente } from '../../../shared/registro-cliente.ts';

const responder = (body: unknown, status = 200) => Response.json(body, { status, headers: { ...cors, 'Cache-Control': 'no-store' } });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return responder({ mensaje: 'Método no permitido.' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !secret) return responder({ mensaje: 'El registro no está disponible en este momento.' }, 503);
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

    // El ingreso público permite el autorregistro. Un metre usa su JWT real;
    // nunca se autentica al cliente sobre la sesión del empleado.
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (token && token !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) throw new FalloRegistro('SESION', 'La sesión venció. Volvé a ingresar.', 401);
      const { data: perfil, error: perfilError } = await admin.from('usuarios').select('perfil, estado_registro').eq('auth_id', data.user.id).maybeSingle();
      if (perfilError) throw perfilError;
      if (perfil?.perfil !== 'metre' || perfil.estado_registro !== 'aceptado') {
        throw new FalloRegistro('PERMISO', 'Este perfil no puede registrar clientes desde una sesión iniciada.', 403);
      }
    }

    const input = await leerJsonLimitado(request);
    const validacion = validarRegistroCliente(input);
    if (Object.keys(validacion.errores).length) throw new FalloRegistro('VALIDACION', 'Revisá los campos indicados.', 400, validacion.errores);
    const claves = await Promise.all([`correo:${validacion.datos.correo}`, `dni:${validacion.datos.dni}`].map(async (valor) => {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(valor));
      return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
    }));
    const { data: permitido, error: limiteError } = await admin.rpc('chido_limitar_registro', { claves });
    if (limiteError) throw limiteError;
    if (!permitido) throw new FalloRegistro('LIMITE', 'Hubo demasiados intentos de registro. Esperá 15 minutos y volvé a intentarlo.', 429);

    const gateway: RegistroGateway = {
      async buscarDuplicado(datos) {
        const { data: correos, error: errorCorreo } = await admin.from('usuarios').select('id').ilike('correo', datos.correo.replace(/[\\%_]/g, '\\$&')).limit(1);
        if (errorCorreo) throw errorCorreo;
        if (correos?.length) return 'correo';
        const { data: dni, error: errorDni } = await admin.from('usuarios').select('id').eq('perfil', 'cliente registrado').eq('dni', datos.dni).limit(1);
        if (errorDni) throw errorDni;
        return dni?.length ? 'dni' : null;
      },
      async crearCuenta(datos) {
        // Conocer el ID antes de enviar permite recuperar una respuesta perdida
        // sin buscar ni modificar cuentas ajenas por correo.
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
          } catch { /* Conservar el ID para revisar un resultado incierto. */ }
          console.error('REGISTRO_REQUIERE_REVISION', { authId: id });
          throw new FalloRegistro('RESULTADO_INCIERTO', 'No pudimos confirmar la creación de la cuenta. Intentá ingresar antes de repetir el registro. Si el problema continúa, consultá con el restaurante.', 503);
        }
      },
      async subirFoto(ruta, foto) {
        const { error } = await admin.storage.from('perfiles').upload(ruta, foto, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
      },
      async perfilExiste(authId) {
        const { data, error } = await admin.from('usuarios').select('id').eq('auth_id', authId).maybeSingle();
        if (error) throw error;
        return !!data;
      },
      async crearPerfil(authId, datos, ruta) {
        const { error } = await admin.from('usuarios').insert({
          auth_id: authId, nombres: datos.nombres, apellidos: datos.apellidos,
          dni: datos.dni, correo: datos.correo, foto_perfil: ruta,
          perfil: 'cliente registrado', estado_registro: 'pendiente',
        });
        if (error?.code === '23505') {
          // Identificar el campo incluso cuando dos altas llegan al mismo tiempo.
          if (error.message.includes('usuarios_dni_cliente_unico')) throw new FalloRegistro('DUPLICADO', 'Revisá el DNI indicado.', 409, { dni: 'Ya existe un cliente con este DNI.' });
          if (error.message.includes('usuarios_correo')) throw new FalloRegistro('DUPLICADO', 'Revisá el correo indicado.', 409, { correo: 'Ya existe una cuenta con este correo.' });
          throw new FalloRegistro('DUPLICADO', 'No se pudo guardar porque ya existe un registro con esos datos. Actualizá el formulario e intentá nuevamente.', 409);
        }
        if (error) throw error;
      },
      async borrarFoto(ruta) { const { error } = await admin.storage.from('perfiles').remove([ruta]); if (error) throw error; },
      async borrarCuenta(id) { const { error } = await admin.auth.admin.deleteUser(id); if (error) throw error; },
      informarLimpiezaFallida(id) { console.error('REGISTRO_REQUIERE_REVISION', { authId: id }); },
    };
    await registrarCliente(input, gateway);
    return responder({ ok: true, estado: 'pendiente' }, 201);
  } catch (error) {
    if (error instanceof FalloRegistro) return responder({ ok: false, codigo: error.codigo, mensaje: error.message, campos: error.campos }, error.status);
    // No registrar el cuerpo, contraseñas, DNI ni respuestas crudas del proveedor.
    console.error('REGISTRO_FALLO_INTERNO');
    return responder({ ok: false, codigo: 'INTERNO', mensaje: 'No se pudo completar el registro. Intentá nuevamente más tarde.' }, 500);
  }
});
