import { supabase } from '../lib/supabase';

export type Mensaje = {
  id: string;
  mesa_id: string;
  usuario_id: string;
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

export const enviarMensaje = async (mesaId: string, usuarioId: string, texto: string, esMozo: boolean = false) => {
  const { error } = await supabase.from('chat_mensajes').insert({
    mesa_id: mesaId,
    usuario_id: usuarioId,
    texto,
    es_mozo: esMozo
  });
  if (error) throw error;
};

export const suscribirMensajes = (mesaId: string, callback: (mensaje: Mensaje) => void) => {
  const channel = supabase
    .channel(`chat_mesa_${mesaId}`)
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
};

