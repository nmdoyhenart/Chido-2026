import { supabase } from '../lib/supabase';
import type { IntentoJuego, PartidaTateti } from '../types/juegos';

export async function obtenerPedidoConfirmadoParaJuegos(clienteId: string) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, descuento_porcentaje')
    .eq('cliente_id', clienteId)
    .eq('estado', 'confirmado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('No se pudo verificar si tenés juegos disponibles.');
  return data as { id: string; descuento_porcentaje: number } | null;
}

export async function iniciarTateti(pedidoId: string) {
  const { data, error } = await supabase.rpc('iniciar_tateti', { p_pedido_id: pedidoId });
  if (error || !data) throw new Error(error?.message ?? 'No se pudo iniciar Ta-te-ti.');
  return data as IntentoJuego;
}

export async function guardarTateti(pedidoId: string, partida: PartidaTateti) {
  const { data, error } = await supabase.rpc('guardar_tateti', { p_pedido_id: pedidoId, p_partida: partida });
  if (error || !data) throw new Error(error?.message ?? 'No se pudo guardar la partida.');
  return data as IntentoJuego;
}

export async function resolverTateti(pedidoId: string, estado: 'ganado' | 'perdido' | 'empate') {
  const { data, error } = await supabase.rpc('resolver_tateti', { p_pedido_id: pedidoId, p_estado: estado });
  if (error || !data) throw new Error(error?.message ?? 'No se pudo guardar el resultado.');
  return data as IntentoJuego;
}
