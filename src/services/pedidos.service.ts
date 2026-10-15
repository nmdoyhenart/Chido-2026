import { supabase } from '../lib/supabase';

export async function encolarPushSegura(
  evento: string,
  titulo: string,
  cuerpo: string,
  datos: any,
  perfiles: string[],
  claveOrigen: string
) {
  try {
    await supabase.rpc('chido_encolar_push_evento', {
      p_evento: evento,
      p_titulo: titulo,
      p_cuerpo: cuerpo,
      p_datos: datos,
      p_perfiles: perfiles,
      p_clave_origen: claveOrigen,
    });
  } catch (err) {
    console.log('Aviso encolarPushSegura rpc:', err);
  }
}

export const crearPedido = async (
  mesaId: string, 
  solicitudId: string,
  detallesPedido: { producto_id: string; cantidad: number }[],
  pedidoId?: string,
) => {
  const { data, error } = await supabase.rpc('guardar_pedido_cliente', {
    p_mesa_id: mesaId,
    p_solicitud_id: solicitudId,
    p_detalles: detallesPedido,
    p_pedido_id: pedidoId ?? null,
  });
  if (error) throw new Error(error.message || 'No se pudo guardar el pedido completo.');
  const resultado = data as { pedido_id?: string; total?: number } | null;
  if (!resultado?.pedido_id || typeof resultado.total !== 'number') {
    throw new Error('Supabase no confirmó el pedido completo.');
  }

  // Notificar al mozo del nuevo pedido (Punto 12 del TP)
  void encolarPushSegura(
    'nuevo_pedido',
    'Nuevo pedido recibido',
    'Hay un nuevo pedido pendiente de confirmación en una mesa.',
    { ruta: '/mozo/pedidos', pedidoId: resultado.pedido_id },
    ['mozo'],
    `pedido_nuevo:${resultado.pedido_id}:${Date.now()}`
  );

  return resultado;
};

export const crearPedidoAnonimo = async (
  clienteAnonimoId: string,
  mesaId: string,
  solicitudId: string,
  detallesPedido: { producto_id: string; cantidad: number }[],
  pedidoId?: string,
) => {
  const { data, error } = await supabase.rpc('guardar_pedido_cliente_anonimo', {
    p_cliente_anonimo_id: clienteAnonimoId,
    p_mesa_id: mesaId,
    p_solicitud_id: solicitudId,
    p_detalles: detallesPedido,
    p_pedido_id: pedidoId ?? null,
  });
  if (error) throw new Error(error.message || 'No se pudo guardar el pedido.');
  const resultado = data as { pedido_id?: string; total?: number } | null;
  if (!resultado?.pedido_id || typeof resultado.total !== 'number') throw new Error('No se confirmó el pedido.');

  // Notificar al mozo del nuevo pedido anónimo (Punto 12 del TP)
  void encolarPushSegura(
    'nuevo_pedido',
    'Nuevo pedido recibido',
    'Hay un nuevo pedido pendiente de confirmación en una mesa.',
    { ruta: '/mozo/pedidos', pedidoId: resultado.pedido_id },
    ['mozo'],
    `pedido_nuevo:${resultado.pedido_id}:${Date.now()}`
  );

  return resultado;
};

export type PedidoRechazado = {
  id: string;
  mesa_id: string;
  estado: 'rechazado';
  detalles: { producto_id: string; cantidad: number }[];
};

export const getPedidoRechazado = async (pedidoId: string): Promise<PedidoRechazado> => {
  const { data, error } = await supabase.rpc('obtener_pedido_rechazado_cliente', { p_pedido_id: pedidoId });
  if (error) throw new Error(error.message || 'No se pudo recuperar el pedido para modificarlo.');
  const pedido = data as PedidoRechazado | null;
  if (!pedido || pedido.estado !== 'rechazado' || !Array.isArray(pedido.detalles)) {
    throw new Error('Este pedido ya no se puede modificar.');
  }
  return pedido;
};

export const getPedidoRechazadoAnonimo = async (clienteAnonimoId: string, pedidoId: string): Promise<PedidoRechazado> => {
  const { data, error } = await supabase.rpc('obtener_pedido_rechazado_anonimo', {
    p_cliente_anonimo_id: clienteAnonimoId, p_pedido_id: pedidoId,
  });
  if (error) throw new Error(error.message || 'No se pudo recuperar el pedido.');
  const pedido = data as PedidoRechazado | null;
  if (!pedido || pedido.estado !== 'rechazado' || !Array.isArray(pedido.detalles)) throw new Error('Este pedido ya no se puede modificar.');
  return pedido;
};

export const getEstadoPedido = async (pedidoId: string): Promise<string> => {
  const { data, error } = await supabase.rpc('obtener_estado_pedido_cliente', { p_pedido_id: pedidoId });
  if (error) throw error;
  return data as string;
};

export const getEstadoPedidoAnonimo = async (clienteAnonimoId: string, pedidoId: string): Promise<string> => {
  const { data, error } = await supabase.rpc('obtener_estado_pedido_anonimo', {
    p_cliente_anonimo_id: clienteAnonimoId, p_pedido_id: pedidoId,
  });
  if (error) throw error;
  return data as string;
};

export const confirmarMesaAnonima = async (clienteAnonimoId: string, mesaId: string) => {
  const { error } = await supabase.rpc('confirmar_mesa_qr_anonimo', {
    p_cliente_anonimo_id: clienteAnonimoId, p_mesa_id: mesaId,
  });
  if (error) throw error;
};

export const suscribirEstadoPedido = (pedidoId: string, callback: (estado: string) => void) => {
  const channel = supabase
    .channel(`pedido_${pedidoId}_${Date.now()}_${Math.random().toString(36).slice(2)}`)
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
    void supabase.removeChannel(channel);
  };
};

export const getEstadisticasPedidos = async () => {
  const { data, error } = await supabase
    .from('pedidos')
    .select('estado, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};
export const getPedidosMozo = async () => {
  const { data, error } = await supabase.rpc('obtener_pedidos_mozo');
  if (error) throw error;
  return (data ?? []) as {
    id: string; estado: string; total: number; created_at: string;
    cuenta_solicitada_at?: string | null;
    mesas: { numero: number; tipo: string; cantidad_comensales: number };
    usuarios: { nombres: string; apellidos: string | null } | null;
    cliente_nombre?: string;
    pedido_detalles: { id: string; cantidad: number; precio_unitario: number; estado_sector: string; productos: { nombre: string; tipo: string } }[];
  }[];
};

export const actualizarEstadoPedido = async (id: string, nuevoEstado: string) => {
  if (nuevoEstado !== 'confirmado' && nuevoEstado !== 'rechazado') throw new Error('La decisión del mozo no es válida.');
  const { error } = await supabase.rpc('decidir_pedido_mozo', { p_pedido_id: id, p_decision: nuevoEstado });
  if (error) throw error;
};

export async function getPedidosSector(tipo: 'plato' | 'bebida') {
  const { data, error } = await supabase.rpc('obtener_trabajo_sector', { p_tipo: tipo });
  if (error) throw error;
  return (data ?? []) as { id: string; mesa_numero: number; created_at: string; detalles: { id: string; producto_id: string; nombre: string; cantidad: number; estado: 'pendiente' | 'en_preparacion' | 'listo'; foto: string | null }[] }[];
}

export async function actualizarEstadoItemSector(detalleId: string, estado: 'pendiente' | 'en_preparacion' | 'listo') {
  const { error } = await supabase.rpc('actualizar_item_sector', { p_detalle_id: detalleId, p_estado: estado });
  if (error) throw error;
}

export async function entregarPedido(id: string) {
  const { error } = await supabase.rpc('entregar_pedido_mozo', { p_pedido_id: id });
  if (error) throw error;
}

export async function confirmarRecepcionPedido(pedidoId: string, clienteAnonimoId?: string) {
  const { error } = clienteAnonimoId
    ? await supabase.rpc('confirmar_recepcion_pedido_anonimo', {
      p_cliente_anonimo_id: clienteAnonimoId,
      p_pedido_id: pedidoId,
    })
    : await supabase.rpc('confirmar_recepcion_pedido_cliente', { p_pedido_id: pedidoId });
  if (error) throw error;
}

export async function solicitarCuentaPedido(pedidoId: string, clienteAnonimoId?: string) {
  try {
    const { error } = clienteAnonimoId
      ? await supabase.rpc('solicitar_cuenta_pedido_anonimo', {
        p_cliente_anonimo_id: clienteAnonimoId,
        p_pedido_id: pedidoId,
      })
      : await supabase.rpc('solicitar_cuenta_pedido_cliente', { p_pedido_id: pedidoId });
    if (error) console.log('Aviso al solicitar cuenta rpc:', error.message);

    // Notificar a los mozos mediante push notification para que revisen la solicitud en /mozo/pedidos
    try {
      const { data: pedidoData } = await supabase
        .from('pedidos')
        .select('mesa_id, mesas(numero)')
        .eq('id', pedidoId)
        .maybeSingle();

      const mesaNum = (pedidoData?.mesas as any)?.numero;
      const mesaTexto = mesaNum ? `Mesa ${mesaNum}` : 'una mesa';

      await encolarPushSegura(
        'cuenta_solicitada',
        'Solicitud de cuenta',
        `El cliente de ${mesaTexto} solicitó la cuenta.`,
        { ruta: '/mozo/pedidos', pedidoId },
        ['mozo'],
        `cuenta_solicitada:${pedidoId}:${Date.now()}`
      );
    } catch (pushErr) {
      console.log('Aviso push de cuenta opcional:', pushErr);
    }
  } catch (err: any) {
    console.log('Error al solicitar cuenta:', err?.message);
  }
}

export type SolicitudCuentaMozo = { pedido_id: string; mesa_id: string; numero: number; solicitada_at: string; cliente: any };

export async function getSolicitudesCuentaMozo(): Promise<SolicitudCuentaMozo[]> {
  try {
    const { data, error } = await supabase.rpc('obtener_solicitudes_cuenta_mozo');
    if (error) return [];
    if (!Array.isArray(data)) return [];
    return data as SolicitudCuentaMozo[];
  } catch {
    return [];
  }
}

