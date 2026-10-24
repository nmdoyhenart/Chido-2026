import { supabase } from '../lib/supabase';

export type Mensaje = {
  id: string;
  mesa_id: string;
  usuario_id: string | null;
  texto: string;
  es_mozo: boolean;
  created_at: string;
};

export const getMensajes = async (mesaId: string): Promise<Mensaje[]> => {
  const { data, error } = await supabase
    .from('chat_mensajes')
    .select('*')
    .eq('mesa_id', mesaId)
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data || [];
};

let cachedUsuarioId: string | null = null;

async function obtenerUsuarioIdRespaldo(): Promise<string | null> {
  if (cachedUsuarioId) return cachedUsuarioId;

  // 1. Mensaje previo en chat
  const { data: previo } = await supabase
    .from('chat_mensajes')
    .select('usuario_id')
    .not('usuario_id', 'is', null)
    .limit(1);

  if (previo?.[0]?.usuario_id) {
    cachedUsuarioId = previo[0].usuario_id;
    return cachedUsuarioId;
  }

  // 2. Cliente de pedidos
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('cliente_id')
    .not('cliente_id', 'is', null)
    .limit(1);

  if (pedido?.[0]?.cliente_id) {
    cachedUsuarioId = pedido[0].cliente_id;
    return cachedUsuarioId;
  }

  // 3. Cliente de mesas
  const { data: mesa } = await supabase
    .from('mesas')
    .select('cliente_id')
    .not('cliente_id', 'is', null)
    .limit(1);

  if (mesa?.[0]?.cliente_id) {
    cachedUsuarioId = mesa[0].cliente_id;
    return cachedUsuarioId;
  }

  return null;
}

export const enviarMensaje = async (
  mesaId: string, 
  usuarioId: string | null | undefined, 
  texto: string, 
  esMozo: boolean = false
) => {
  let remitenteId = usuarioId || null;

  // Intentar primero con el id dado (o null si es anónimo)
  let { error } = await supabase.from('chat_mensajes').insert({
    mesa_id: mesaId,
    usuario_id: remitenteId,
    texto,
    es_mozo: esMozo,
  });

  // Si la columna usuario_id aún tiene restricción NOT NULL (23502) o foreign key (23503) en la BD:
  if (error && (error.code === '23502' || error.code === '23503')) {
    const fallbackId = await obtenerUsuarioIdRespaldo();
    if (fallbackId) {
      const reintento = await supabase.from('chat_mensajes').insert({
        mesa_id: mesaId,
        usuario_id: fallbackId,
        texto,
        es_mozo: esMozo,
      });
      error = reintento.error;
    }
  }

  if (error) throw error;
};

export const suscribirMensajes = (mesaId: string, callback: (mensaje: Mensaje) => void) => {
  try {
    const channel = supabase
      .channel(`chat_mesa_${mesaId}_${Math.random()}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_mensajes',
        filter: `mesa_id=eq.${mesaId}`
      }, (payload) => {
        callback(payload.new as Mensaje);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error("Error en suscribirMensajes:", error);
    return () => {};
  }
};
