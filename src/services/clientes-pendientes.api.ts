import type { SupabaseClient } from '@supabase/supabase-js';

export type ClientePendiente = { id: string; nombres: string; apellidos: string | null; dni: string | null; correo: string | null; foto_perfil: string; fotoUrl: string | null };
export const TAMANO_PAGINA = 10;

async function mensajeErrorDecision(error: unknown): Promise<string> {
  const contexto = typeof error === 'object' && error !== null && 'context' in error
    ? (error as { context?: unknown }).context
    : null;
  const respuesta = typeof contexto === 'object' && contexto !== null && 'status' in contexto
    ? contexto as { status?: unknown; json?: () => Promise<unknown> }
    : null;
  if (respuesta?.status === 401) return 'Tu sesión venció. Volvé a ingresar con la cuenta del dueño o supervisor e intentá nuevamente.';
  try {
    const cuerpo = await respuesta?.json?.();
    if (typeof cuerpo === 'object' && cuerpo !== null && typeof (cuerpo as { mensaje?: unknown }).mensaje === 'string') {
      return (cuerpo as { mensaje: string }).mensaje;
    }
  } catch {
    // La respuesta puede no contener JSON cuando falla la red o el gateway.
  }
  return 'No pudimos confirmar la decisión. Actualizá la lista antes de volver a intentarlo.';
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
      const { data, error } = await cliente.functions.invoke<{ ok?: boolean; mensaje?: string }>('resolver-registro', {
        body: { clienteId: id, estado },
      });
      if (error) throw new Error(await mensajeErrorDecision(error));
      if (!data?.ok) throw new Error(data?.mensaje ?? 'No pudimos confirmar la decisión. Actualizá la lista antes de volver a intentarlo.');
    },
  };
}
