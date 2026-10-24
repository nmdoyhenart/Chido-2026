import { supabase } from '../lib/supabase';
import type { PorcentajePropina } from '../types/qr';
import { parseQrPayload } from '../utils/qr';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DetalleProductoCuenta = {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto: {
    id: string;
    nombre: string;
    tipo: string;
    fotos: string[];
  };
};

export type CuentaCompleta = {
  pedidoId: string;
  mesaId: string;
  mesaNumero: number | null;
  mesaTipo?: string | null;
  estado: string;
  subtotal: number;
  descuentoPorcentaje: number;
  descuentoMonto: number;
  propinaPorcentaje: PorcentajePropina | null;
  propinaMonto: number;
  totalFinal: number;
  cuentaSolicitadaAt: string | null;
  detalles: DetalleProductoCuenta[];
};

export async function obtenerCuentaPedido(pedidoId: string, clienteAnonimoId?: string): Promise<CuentaCompleta> {
  const { data, error } = clienteAnonimoId
    ? await supabase.rpc('obtener_cuenta_pedido_anonimo', {
      p_cliente_anonimo_id: clienteAnonimoId,
      p_pedido_id: pedidoId,
    })
    : await supabase.rpc('obtener_cuenta_pedido_cliente', { p_pedido_id: pedidoId });

  if (error || !data || typeof data !== 'object') {
    throw new Error(error?.message || 'No se pudo encontrar el pedido para generar la cuenta.');
  }
  const pedido = data as Record<string, any>;
  const detalles = Array.isArray(pedido.detalles) ? pedido.detalles : [];

  const items: DetalleProductoCuenta[] = detalles.map((d: any) => {
    const pUnit = Number(d.precio_unitario) || 0;
    const cant = Number(d.cantidad) || 0;
    return {
      id: d.id,
      cantidad: cant,
      precio_unitario: pUnit,
      subtotal: pUnit * cant,
      producto: {
        id: d.producto?.id || '',
        nombre: d.producto?.nombre || 'Producto',
        tipo: d.producto?.tipo || '',
        fotos: d.producto?.fotos || [],
      },
    };
  });

  const subtotal = items.reduce((acc, curr) => acc + curr.subtotal, 0);
  let descuentoPorcentaje = Number(pedido.descuento_porcentaje) || 0;
  try {
    const guardado = await AsyncStorage.getItem(`descuento_pedido_${pedidoId}`);
    if (guardado) {
      descuentoPorcentaje = Math.max(descuentoPorcentaje, Number(guardado) || 0);
    }
  } catch {
    // Si no hay descuento guardado se mantiene el valor actual
  }
  const descuentoMonto = Math.round((subtotal * descuentoPorcentaje) / 100);
  const baseConDescuento = Math.max(0, subtotal - descuentoMonto);

  const propinaPorcentaje = pedido.propina_porcentaje !== null && pedido.propina_porcentaje !== undefined
    ? (Number(pedido.propina_porcentaje) as PorcentajePropina)
    : null;

  const propinaMonto = propinaPorcentaje !== null
    ? Math.round((baseConDescuento * propinaPorcentaje) / 100)
    : 0;

  const totalFinal = baseConDescuento + propinaMonto;

  let mesaTipo: string | null = null;
  if (pedido.mesa_id) {
    try {
      const { data: mData } = await supabase.from('mesas').select('tipo').eq('id', pedido.mesa_id).maybeSingle();
      mesaTipo = mData?.tipo ?? null;
    } catch {
      // ignore
    }
  }

  return {
    pedidoId: pedido.pedido_id,
    mesaId: pedido.mesa_id,
    mesaNumero: pedido.mesa_numero ?? null,
    mesaTipo,
    estado: pedido.estado,
    subtotal,
    descuentoPorcentaje,
    descuentoMonto,
    propinaPorcentaje,
    propinaMonto,
    totalFinal,
    cuentaSolicitadaAt: pedido.cuenta_solicitada_at ?? null,
    detalles: items,
  };
}

export async function registrarPropinaPorQr(
  pedidoId: string,
  rawQr: string,
  clienteAnonimoId?: string
): Promise<PorcentajePropina> {
  const payload = parseQrPayload(rawQr);
  if (!payload || payload.tipo !== 'propina') {
    throw new Error('El código QR escaneado no corresponde a una propina válida.');
  }

  const { data, error } = clienteAnonimoId
    ? await supabase.rpc('registrar_propina_pedido_anonimo', {
      p_cliente_anonimo_id: clienteAnonimoId,
      p_pedido_id: pedidoId,
      p_porcentaje: payload.porcentaje,
    })
    : await supabase.rpc('registrar_propina_pedido_cliente', {
      p_pedido_id: pedidoId,
      p_porcentaje: payload.porcentaje,
    });

  if (error || data === null) {
    throw new Error(error?.message || 'No se pudo guardar la propina seleccionada.');
  }

  return payload.porcentaje;
}

export async function registrarPropinaDirecta(
  pedidoId: string,
  porcentaje: PorcentajePropina,
  clienteAnonimoId?: string,
): Promise<PorcentajePropina> {
  const { data, error } = clienteAnonimoId
    ? await supabase.rpc('registrar_propina_pedido_anonimo', {
      p_cliente_anonimo_id: clienteAnonimoId,
      p_pedido_id: pedidoId,
      p_porcentaje: porcentaje,
    })
    : await supabase.rpc('registrar_propina_pedido_cliente', {
      p_pedido_id: pedidoId,
      p_porcentaje: porcentaje,
    });

  if (error || data === null) {
    throw new Error(error?.message || 'No se pudo guardar la propina seleccionada.');
  }

  return porcentaje;
}

export async function informarPago(
  pedidoId: string,
  clienteAnonimoId?: string
): Promise<void> {
  const { error } = clienteAnonimoId
    ? await supabase.rpc('informar_pago_pedido_anonimo', {
      p_cliente_anonimo_id: clienteAnonimoId,
      p_pedido_id: pedidoId,
    })
    : await supabase.rpc('informar_pago_pedido_cliente', {
      p_pedido_id: pedidoId,
    });

  if (error) {
    throw new Error(error.message || 'No se pudo confirmar el aviso de pago.');
  }
}

export async function verificarEstadoPago(
  pedidoId: string,
  clienteAnonimoId?: string
): Promise<'pendiente' | 'pago_informado' | 'pagado'> {
  const { data, error } = clienteAnonimoId
    ? await supabase.rpc('obtener_cuenta_pedido_anonimo', {
      p_cliente_anonimo_id: clienteAnonimoId,
      p_pedido_id: pedidoId,
    })
    : await supabase.rpc('obtener_cuenta_pedido_cliente', {
      p_pedido_id: pedidoId,
    });

  if (error || !data || typeof data !== 'object') {
    return 'pendiente';
  }
  const estado = (data as any).estado;
  if (estado === 'pagado') return 'pagado';
  if (estado === 'pago_informado') return 'pago_informado';
  return 'pendiente';
}
