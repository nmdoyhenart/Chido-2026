import { supabase } from '../lib/supabase';
import type { EstadoAhorcado, EstadoMemotest, IntentoJuego, PartidaTateti } from '../types/juegos';

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

export async function iniciarMemotest(pedidoId: string) {
  const { data, error } = await supabase.rpc('iniciar_memotest', { p_pedido_id: pedidoId });
  if (error || !data) throw new Error(error?.message ?? 'No se pudo iniciar Memotest.');
  return data as EstadoMemotest;
}

export async function voltearMemotest(pedidoId: string, indice: number) {
  const { data, error } = await supabase.rpc('voltear_memotest', { p_pedido_id: pedidoId, p_indice: indice });
  if (error || !data) throw new Error(error?.message ?? 'No se pudo voltear la carta.');
  return data as EstadoMemotest;
}

export async function iniciarAhorcado(pedidoId: string) {
  const { data, error } = await supabase.rpc('iniciar_ahorcado', { p_pedido_id: pedidoId });
  if (error || !data) throw new Error(error?.message ?? 'No se pudo iniciar Ahorcado.');
  return data as EstadoAhorcado;
}

export async function intentarLetraAhorcado(pedidoId: string, letra: string) {
  const { data, error } = await supabase.rpc('intentar_letra_ahorcado', { p_pedido_id: pedidoId, p_letra: letra });
  if (error || !data) throw new Error(error?.message ?? 'No se pudo registrar la letra.');
  return data as EstadoAhorcado;
}
