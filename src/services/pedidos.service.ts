import { supabase } from '../lib/supabase';

export const crearPedido = async (
  clienteId: string, 
  mesaId: string, 
  total: number, 
  detallesPedido: { producto_id: string; cantidad: number; precio_unitario: number }[]
) => {
  const { data: nuevoPedido, error } = await supabase.from('pedidos').insert({
    cliente_id: clienteId,
    mesa_id: mesaId,
    estado: 'pendiente_mozo',
    total: total
  }).select().single();
  
  if (error || !nuevoPedido) {
    console.error('Error insertando pedido:', error);
    throw error || new Error('No se pudo crear el pedido');
  }

  const detalles = detallesPedido.map(d => ({
    pedido_id: nuevoPedido.id,
    producto_id: d.producto_id,
    cantidad: d.cantidad,
    precio_unitario: d.precio_unitario
  }));

  const { error: errorDetalles } = await supabase.from('pedido_detalles').insert(detalles);
  if (errorDetalles) throw errorDetalles;

  return nuevoPedido.id;
};

export const getEstadoPedido = async (pedidoId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('pedidos')
    .select('estado')
    .eq('id', pedidoId)
    .single();
  
  if (error) throw error;
  return data.estado;
};

export const suscribirEstadoPedido = (pedidoId: string, callback: (estado: string) => void) => {
  const channel = supabase
    .channel(`pedido_${pedidoId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'pedidos',
      filter: `id=eq.${pedidoId}`
    }, (payload) => {
      callback(payload.new.estado);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

