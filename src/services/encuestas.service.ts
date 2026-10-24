import { supabase } from '../lib/supabase';

export interface EncuestaData {
  pedido_id: string;
  cliente_id?: string;
  lista_espera_id?: string;
  comida: number; // 1-5
  atencion: number; // 1-5
  experiencia: number; // 1-5
  comentario?: string;
}

export const enviarEncuesta = async (data: EncuestaData) => {
  let realListaEsperaId = data.lista_espera_id || null;

  if (realListaEsperaId) {
    // Si viene un identificador de cliente anónimo, buscar el ID real (UUID de la fila)
    const { data: lista, error: errLista } = await supabase
      .from('lista_espera')
      .select('id')
      .eq('identificador', realListaEsperaId)
      .single();
    
    if (!errLista && lista) {
      realListaEsperaId = lista.id;
    }
  }

  if (data.pedido_id) {
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('estado')
      .eq('id', data.pedido_id)
      .maybeSingle();

    if (pedido && !['recibido', 'pago_informado', 'finalizado'].includes(pedido.estado)) {
      throw new Error('Debés confirmar la recepción de tu pedido antes de enviar la encuesta.');
    }
  }

  const { error } = await supabase
    .from('encuestas_pedidos')
    .insert([{
      pedido_id: data.pedido_id,
      cliente_id: data.cliente_id || null,
      lista_espera_id: realListaEsperaId,
      comida: data.comida,
      atencion: data.atencion,
      experiencia: data.experiencia,
      comentario: data.comentario || null
    }]);

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya enviaste una encuesta para este pedido.');
    }
    throw new Error(error.message || 'Error al enviar la encuesta.');
  }
};

export const verificarEncuesta = async (pedidoId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('encuestas_pedidos')
    .select('id')
    .eq('pedido_id', pedidoId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('Error verificando encuesta:', error);
  }
  return !!data;
};

