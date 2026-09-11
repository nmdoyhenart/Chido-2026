import type { SupabaseClient } from '@supabase/supabase-js';

export type ClientePendiente = { id: string; nombres: string; apellidos: string | null; dni: string | null; correo: string | null; foto_perfil: string; fotoUrl: string | null };
export const TAMANO_PAGINA = 10;

function mensajeErrorDecision(error: { code?: string }, status: number): string {
  if (status === 401 || error.code === 'PGRST301' || error.code === 'PGRST303') {
    return 'Tu sesión venció. Volvé a ingresar con la cuenta del dueño o supervisor e intentá nuevamente.';
  }
  if (error.code === '42501') {
    return 'Supabase no permitió guardar la decisión. Hay que revisar los permisos de aprobación de esta cuenta (código 42501).';
  }
  // No exponemos detalles internos que puedan contener datos personales.
  const codigo = error.code && /^[A-Z0-9]{5,12}$/.test(error.code) ? ` (código ${error.code})` : '';
  return `No pudimos confirmar la decisión${codigo}. Actualizá la lista antes de volver a intentarlo.`;
}

export function crearApiAprobaciones(cliente: SupabaseClient) {
  return {
    async contarPendientes(): Promise<number> {
      const { count, error } = await cliente.from('usuarios').select('id', { count: 'exact', head: true })
        .eq('perfil', 'cliente registrado').eq('estado_registro', 'pendiente').not('auth_id', 'is', null);
      if (error || count === null) throw new Error('No pudimos consultar las solicitudes pendientes.');
      return count;
    },
    async listarPendientes(pagina: number): Promise<{ clientes: ClientePendiente[]; total: number }> {
      if (!Number.isInteger(pagina) || pagina < 0) throw new Error('La página solicitada no es válida.');
      const { data, error, count } = await cliente.from('usuarios')
        .select('id,nombres,apellidos,dni,correo,foto_perfil', { count: 'exact' })
        .eq('perfil', 'cliente registrado').eq('estado_registro', 'pendiente')
        // Al borrar la cuenta de Authentication, la FK deja auth_id en null.
        .not('auth_id', 'is', null)
        .order('created_at').order('id').range(pagina * TAMANO_PAGINA, (pagina + 1) * TAMANO_PAGINA - 1);
      if (error || count === null) throw new Error('No se pudieron cargar las solicitudes. Revisá la conexión.');
      const clientes = await Promise.all((data ?? []).map(async (registro) => {
        let fotoUrl: string | null = null;
        try {
          const { data: foto, error: errorFoto } = await cliente.storage.from('perfiles').createSignedUrl(registro.foto_perfil, 300);
          if (!errorFoto) fotoUrl = foto?.signedUrl ?? null;
        } catch { /* Una foto fallida no debe ocultar la solicitud completa. */ }
        return { ...registro, fotoUrl };
      }));
      return { clientes, total: count };
    },
    async resolverCliente(id: string, estado: 'aceptado' | 'rechazado'): Promise<void> {
      if (!id || !['aceptado', 'rechazado'].includes(estado)) throw new Error('La decisión solicitada no es válida.');
      // La base verifica los permisos. Sólo se resuelve una solicitud pendiente,
      // para no sobrescribir una decisión tomada por otro responsable.
      const { data, error, status } = await cliente.from('usuarios').update({ estado_registro: estado })
        .eq('id', id).eq('perfil', 'cliente registrado').eq('estado_registro', 'pendiente')
        .not('auth_id', 'is', null).select('id');
      if (error) throw new Error(mensajeErrorDecision(error, status));
      if (data?.length !== 1) throw new Error('La solicitud ya fue resuelta, su cuenta fue eliminada o no tenés permiso para modificarla. Actualizá la lista.');
    },
  };
}
