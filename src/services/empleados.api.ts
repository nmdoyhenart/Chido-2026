import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { validarRegistroEmpleado, type DatosRegistroEmpleado, type ErroresRegistroEmpleado } from '../../shared/registro-empleado';

type Resultado = { ok: true } | { ok: false; mensaje: string; campos?: ErroresRegistroEmpleado };
class TiempoAgotado extends Error {}

async function conLimite<T>(operacion: PromiseLike<T>, milisegundos: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operacion, new Promise<never>((_, rechazar) => {
      timer = setTimeout(() => rechazar(new TiempoAgotado()), milisegundos);
    })]);
  } finally { clearTimeout(timer); }
}

export function crearServicioEmpleados(cliente: Pick<SupabaseClient, 'auth' | 'functions'>, limites = { sesion: 10000, envio: 50000 }) {
  return async function crearEmpleado(datos: DatosRegistroEmpleado): Promise<Resultado> {
    const validacion = validarRegistroEmpleado(datos);
    if (Object.keys(validacion.errores).length) return { ok: false, mensaje: 'Revisá los campos indicados.', campos: validacion.errores };
    let token: string;
    try {
      const { data, error } = await conLimite(cliente.auth.getSession(), limites.sesion);
      if (error || !data.session) return { ok: false, mensaje: 'Iniciá sesión con una cuenta de dueño o supervisor para registrar empleados.' };
      token = data.session.access_token;
    } catch {
      return { ok: false, mensaje: 'No se pudo recuperar tu sesión. Cerrá sesión y volvé a ingresar antes de registrar al empleado.' };
    }
    const controller = new AbortController();
    try {
      const { data, error } = await conLimite(cliente.functions.invoke('registrar-empleado', {
        body: validacion.datos, headers: { Authorization: `Bearer ${token}` },
        timeout: 45000, signal: controller.signal,
      }), limites.envio);
      if (error instanceof FunctionsHttpError) {
        const status = error.context.status;
        const respuesta: unknown = await conLimite(error.context.json().catch(() => null), 5000);
        if (respuesta && typeof respuesta === 'object' && 'mensaje' in respuesta && typeof respuesta.mensaje === 'string') {
          const campos: ErroresRegistroEmpleado = {};
          if ('campos' in respuesta && respuesta.campos && typeof respuesta.campos === 'object') {
            for (const campo of ['nombres', 'apellidos', 'dni', 'cuil', 'correo', 'password', 'fotoBase64', 'perfil'] as const) {
              const valor = (respuesta.campos as Record<string, unknown>)[campo];
              if (typeof valor === 'string') campos[campo] = valor.slice(0, 250);
            }
          }
          return { ok: false, mensaje: respuesta.mensaje.slice(0, 500), campos };
        }
        const mensajes: Record<number, string> = {
          401: 'Supabase rechazó la sesión antes de ejecutar el registro. Volvé a ingresar; si persiste, hay que revisar la verificación JWT de registrar-empleado.',
          403: 'Tu cuenta no tiene permiso para registrar empleados. Debe ser dueño o supervisor aceptado.',
          404: 'La función registrar-empleado no está publicada en este proyecto de Supabase.',
          413: 'La foto es demasiado pesada. Volvé a tomarla.',
          546: 'El servidor agotó el tiempo para registrar al empleado. Revisá si se creó antes de volver a enviarlo.',
        };
        return { ok: false, mensaje: mensajes[status] ?? `El servidor no pudo completar el registro (HTTP ${status}). Revisá si el empleado se creó antes de reintentar.` };
      }
      if (!error && data?.ok === true && data?.estado === 'aceptado') return { ok: true };
      return { ok: false, mensaje: 'No recibimos la confirmación del servidor. El empleado podría haberse creado: revisá Authentication y usuarios en Supabase antes de repetir el envío.' };
    } catch (error) {
      return { ok: false, mensaje: error instanceof TiempoAgotado
        ? 'El registro demoró demasiado. El empleado podría haberse creado: revisá Authentication y usuarios en Supabase antes de repetir el envío.'
        : 'Se interrumpió la comunicación con Supabase. Revisá si el empleado se creó antes de repetir el envío.' };
    } finally { controller.abort(); }
  };
}
