import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../Header';
import { useAppSession } from '../../contexts/AppSessionContext';
import { colores } from '../../theme/colores';
import { supabase } from '../../lib/supabase';
import { actualizarEstadoItemSector, getPedidosSector } from '../../services/pedidos.service';

type TipoSector = 'plato' | 'bebida';
type Item = { id: string; producto_id: string; nombre: string; cantidad: number; estado: 'pendiente' | 'en_preparacion' | 'listo'; foto: string | null };
type PedidoSector = { id: string; mesa_numero: number; created_at: string; detalles: Item[] };

export default function BandejaSector({ tipo }: { tipo: TipoSector }) {
  const router = useRouter();
  const { mode, role, usuario, cargando } = useAppSession();
  const esperado = tipo === 'plato' ? 'cocinero' : 'cantinero';
  const titulo = tipo === 'plato' ? 'Pedidos de cocina' : 'Pedidos de bar';
  const [pedidos, setPedidos] = useState<PedidoSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try { setPedidos(await getPedidosSector(tipo)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los pedidos.'); }
    finally { setLoading(false); }
  }, [tipo]);

  useEffect(() => {
    if (mode !== 'authenticated' || role !== esperado) return;
    const inicial = setTimeout(() => { void cargar(); }, 0);
    const canal = supabase.channel(`pedidos-sector-${tipo}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => { void cargar(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_detalles' }, () => { void cargar(); })
      .subscribe();
    const intervalo = setInterval(() => { void cargar(); }, 10000);
    return () => { clearTimeout(inicial); clearInterval(intervalo); void supabase.removeChannel(canal); };
  }, [cargar, esperado, mode, role, tipo]);

  async function avanzar(item: Item) {
    if (actualizando) return;
    const siguiente = item.estado === 'pendiente' ? 'en_preparacion' : 'listo';
    setActualizando(item.id);
    try { await actualizarEstadoItemSector(item.id, siguiente); await cargar(); }
    catch (caught) { Alert.alert('No se pudo actualizar el producto', caught instanceof Error ? caught.message : 'Intentá nuevamente.'); }
    finally { setActualizando(null); }
  }

  if (cargando) return <View className="flex-1 items-center justify-center bg-chido-fondo"><ActivityIndicator color={colores.textoSobreOscuro} /></View>;
  if (mode !== 'authenticated' || role !== esperado) {
    return <View className="flex-1 justify-center bg-chido-fondo p-6"><Stack.Screen options={{ headerShown: false }} /><Text className="text-center text-xl font-bold text-chido-texto-sobre-oscuro">Esta bandeja requiere ingresar con una cuenta de {tipo === 'plato' ? 'cocinero' : 'cantinero'}.</Text></View>;
  }

  return <View className="flex-1 bg-chido-fondo">
    <Stack.Screen options={{ headerShown: false }} />
    <Header userName={[usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || esperado} role={titulo} />
    <View className="flex-row items-center justify-between px-5 py-4">
      <Text className="text-2xl font-bold text-chido-texto-sobre-oscuro">{titulo}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push(tipo === 'plato' ? '/productos/alta' : '/productos/alta-bebida')} className="rounded-xl border border-chido-texto-secundario-alternativo bg-chido-cabecera px-4 py-3">
        <Text className="font-bold text-chido-texto-sobre-oscuro">Alta</Text>
      </Pressable>
    </View>
    {loading ? <ActivityIndicator className="mt-8" size="large" color={colores.textoSobreOscuro} /> : error ? <View className="p-6"><Text className="text-center text-chido-texto-sobre-oscuro">{error}</Text><Pressable accessibilityRole="button" onPress={() => void cargar()} className="mt-4 rounded-xl bg-chido-cabecera p-4"><Text className="text-center font-bold text-chido-texto-sobre-oscuro">Reintentar</Text></Pressable></View> : <FlatList
      data={pedidos}
      keyExtractor={pedido => pedido.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12, flexGrow: 1 }}
      ListEmptyComponent={<Text className="mt-10 text-center text-lg text-chido-texto-secundario-sobre-oscuro">Todavía no hay productos confirmados en este sector.</Text>}
      renderItem={({ item: pedido }) => <View className="rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-4">
        <Text className="mb-3 text-xl font-extrabold text-chido-texto-sobre-oscuro">Mesa {pedido.mesa_numero}</Text>
        {pedido.detalles.map(detalle => <View key={detalle.id} className="mb-3 flex-row items-center gap-3 rounded-xl bg-chido-superficieTerracota p-3">
          {detalle.foto ? <Image source={{ uri: detalle.foto }} accessibilityLabel={detalle.nombre} style={{ width: 52, height: 52, borderRadius: 10 }} resizeMode="cover" /> : <Ionicons name={tipo === 'plato' ? 'restaurant-outline' : 'wine-outline'} size={34} color={colores.textoSobreOscuro} />}
          <View className="flex-1"><Text className="text-lg font-bold text-chido-texto-sobre-oscuro">{detalle.cantidad} × {detalle.nombre}</Text><Text className="text-chido-texto-secundario-sobre-oscuro">{detalle.estado === 'pendiente' ? 'Pendiente' : detalle.estado === 'en_preparacion' ? 'En preparación' : 'Listo'}</Text></View>
          {detalle.estado !== 'listo' && <Pressable disabled={actualizando !== null} accessibilityRole="button" onPress={() => void avanzar(detalle)} className="rounded-lg border border-chido-texto-sobre-oscuro bg-chido-botonPrincipal px-3 py-3"><Text className="text-center font-bold text-chido-texto-sobre-oscuro">{actualizando === detalle.id ? '…' : detalle.estado === 'pendiente' ? 'Preparar' : 'Listo'}</Text></Pressable>}
        </View>)}
      </View>}
    />}
  </View>;
}
