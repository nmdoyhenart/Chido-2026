import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase, supabaseRegistroPublico } from '../lib/supabase';
import { validarRegistroCliente, type DatosRegistroCliente, type ErroresRegistro } from '../../shared/registro-cliente';

type Resultado = { ok: true } | { ok: false; mensaje: string; campos?: ErroresRegistro };

export async function registrarCliente(datos: DatosRegistroCliente, esMetre: boolean): Promise<Resultado> {
  const validacion = validarRegistroCliente(datos);
  if (Object.keys(validacion.errores).length) return { ok: false, mensaje: 'Revisá los campos indicados.', campos: validacion.errores };
  // Esta petición no inicia una sesión para el nuevo cliente ni reemplaza la del metre.
  const cliente = esMetre ? supabase : supabaseRegistroPublico;
  const { data, error } = await cliente.functions.invoke('registrar-cliente', { body: validacion.datos, timeout: 45000 });
  if (error instanceof FunctionsHttpError) {
    try {
      const respuesta: unknown = await error.context.json();
      if (respuesta && typeof respuesta === 'object' && 'mensaje' in respuesta && typeof respuesta.mensaje === 'string') {
        const campos: ErroresRegistro = {};
        if ('campos' in respuesta && respuesta.campos && typeof respuesta.campos === 'object') {
          for (const campo of ['nombres', 'apellidos', 'dni', 'correo', 'password', 'fotoBase64'] as const) {
            const valor = (respuesta.campos as Record<string, unknown>)[campo];
            if (typeof valor === 'string') campos[campo] = valor.slice(0, 250);
          }
        }
        return { ok: false, mensaje: respuesta.mensaje.slice(0, 500), campos };
      }
    } catch { /* Respuesta vacía o no JSON: mostrar el mensaje general. */ }
  }
  if (error || data?.ok !== true || data?.estado !== 'pendiente') return {
    ok: false,
    mensaje: 'No pudimos confirmar el registro. Revisá la conexión. Si ya lo enviaste, intentá ingresar antes de repetirlo.',
  };
  return { ok: true };
}
