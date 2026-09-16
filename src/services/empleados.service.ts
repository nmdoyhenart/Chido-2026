import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { validarRegistroEmpleado, type DatosRegistroEmpleado, type ErroresRegistroEmpleado } from '../../shared/registro-empleado';

type Resultado = { ok: true } | { ok: false; mensaje: string; campos?: ErroresRegistroEmpleado };

export async function crearEmpleado(datos: DatosRegistroEmpleado): Promise<Resultado> {
  const validacion = validarRegistroEmpleado(datos);
  if (Object.keys(validacion.errores).length) return { ok: false, mensaje: 'Revisá los campos indicados.', campos: validacion.errores };
  
  const { data, error } = await supabase.functions.invoke('registrar-empleado', { body: validacion.datos, timeout: 45000 });
  
  if (error instanceof FunctionsHttpError) {
    try {
      const respuesta: unknown = await error.context.json();
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
    } catch { /* Respuesta vacía o no JSON: mostrar el mensaje general. */ }
  }
  
  if (error || data?.ok !== true) return {
    ok: false,
    mensaje: 'No pudimos confirmar el registro. Revisá la conexión.',
  };
  
  return { ok: true };
}
