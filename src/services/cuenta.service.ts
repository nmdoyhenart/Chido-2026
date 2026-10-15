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

export async function obtenerCuentaPedido(pedidoId: string): Promise<CuentaCompleta> {
  const { data: pedido, error: errorPedido } = await supabase
    .from('pedidos')
    .select(`
      id,
      mesa_id,
      estado,
      total,
      descuento_porcentaje,
      propina_porcentaje,
      mesas (
        numero
      )
    `)
    .eq('id', pedidoId)
    .single();

  if (errorPedido || !pedido) {
    console.error('Error al obtener pedido para cuenta:', errorPedido);
    throw new Error(errorPedido?.message || 'No se pudo encontrar el pedido para generar la cuenta.');
  }

  const { data: detalles, error: errorDetalles } = await supabase
    .from('pedido_detalles')
    .select(`
      id,
      cantidad,
      precio_unitario,
      productos (
        id,
        nombre,
        tipo,
        fotos
      )
    `)
    .eq('pedido_id', pedidoId);

  if (errorDetalles || !detalles) {
    console.error('Error al obtener detalles del pedido:', errorDetalles);
    throw new Error(errorDetalles?.message || 'No se pudieron obtener los productos del pedido.');
  }

  const items: DetalleProductoCuenta[] = detalles.map((d: any) => {
    const pUnit = Number(d.precio_unitario) || 0;
    const cant = Number(d.cantidad) || 0;
    return {
      id: d.id,
      cantidad: cant,
      precio_unitario: pUnit,
      subtotal: pUnit * cant,
      producto: {
        id: d.productos?.id || '',
        nombre: d.productos?.nombre || 'Producto',
        tipo: d.productos?.tipo || '',
        fotos: d.productos?.fotos || [],
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

  const mesaNumero = (pedido.mesas as any)?.numero ?? null;

  return {
    pedidoId: pedido.id,
    mesaId: pedido.mesa_id,
    mesaNumero,
    estado: pedido.estado,
    subtotal,
    descuentoPorcentaje,
    descuentoMonto,
    propinaPorcentaje,
    propinaMonto,
    totalFinal,
    cuentaSolicitadaAt: (pedido as any).cuenta_solicitada_at ?? null,
    detalles: items,
  };
}

export async function registrarPropinaPorQr(
  pedidoId: string,
  rawQr: string
): Promise<PorcentajePropina> {
  const payload = parseQrPayload(rawQr);
  if (!payload || payload.tipo !== 'propina') {
    throw new Error('El código escaneado no corresponde a una propina válida.');
  }

  const { error } = await supabase
    .from('pedidos')
    .update({ propina_porcentaje: payload.porcentaje })
    .eq('id', pedidoId);

  if (error) {
    throw new Error('No se pudo guardar la propina seleccionada.');
  }

  return payload.porcentaje;
}

export async function registrarPropinaDirecta(
  pedidoId: string,
  porcentaje: PorcentajePropina
): Promise<PorcentajePropina> {
  const { error } = await supabase
    .from('pedidos')
    .update({ propina_porcentaje: porcentaje })
    .eq('id', pedidoId);

  if (error) {
    throw new Error('No se pudo guardar la propina seleccionada.');
  }

  return porcentaje;
}

export async function registrarPagoSimulado(
  pedidoId: string,
  montoTotal: number,
  _mesaNumero?: number | null
): Promise<void> {
  const { error } = await supabase
    .from('pedidos')
    .update({
      estado: 'pagado',
      total: montoTotal,
    })
    .eq('id', pedidoId);

  if (error) {
    throw new Error(error.message || 'No se pudo registrar el pago.');
  }
}

