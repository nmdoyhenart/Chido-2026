import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../Header';
import { useAppSession } from '../../contexts/AppSessionContext';
import { colores } from '../../theme/colores';
import { supabase } from '../../lib/supabase';
import { actualizarEstadoItemSector, getPedidosSector } from '../../services/pedidos.service';

type TipoSector = 'plato' | 'bebida';
type EstadoItem = 'pendiente' | 'en_preparacion' | 'listo';
type Item = { id: string; producto_id: string; nombre: string; cantidad: number; estado: EstadoItem; foto: string | null };
type PedidoSector = { id: string; mesa_numero: number; created_at: string; detalles: Item[] };

const PEDIDOS_POR_PAGINA = 2;

function fechaPedido(fecha: string) {
  const instante = new Date(fecha);
  if (Number.isNaN(instante.getTime())) return 'Fecha no disponible';
  return instante.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const PRESENTACION_ESTADO: Record<EstadoItem, { texto: string; icono: keyof typeof Ionicons.glyphMap; color: string }> = {
  pendiente: { texto: 'Pendiente', icono: 'time-outline', color: '#F0B44D' },
  en_preparacion: { texto: 'En preparación', icono: 'flame-outline', color: '#F0B44D' },
  listo: { texto: 'Listo', icono: 'checkmark-circle', color: '#8DDB78' },
};

export default function BandejaSector({ tipo }: { tipo: TipoSector }) {
  const router = useRouter();
  const { mode, role, usuario, cargando } = useAppSession();
  const esperado = tipo === 'plato' ? 'cocinero' : 'cantinero';
  const titulo = tipo === 'plato' ? 'Pedidos de cocina' : 'Pedidos de bar';
  const scroll = useRef<ScrollView>(null);
  const [pedidos, setPedidos] = useState<PedidoSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [altoPagina, setAltoPagina] = useState(0);
  const [pagina, setPagina] = useState(0);

  // Mesa como primer criterio para mantener juntos sus pedidos; dentro de cada mesa, orden cronológico.
  const pedidosOrdenados = useMemo(() => [...pedidos].sort((a, b) =>
    a.mesa_numero - b.mesa_numero || new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  ), [pedidos]);
  const paginas = useMemo(() => Array.from(
    { length: Math.ceil(pedidosOrdenados.length / PEDIDOS_POR_PAGINA) },
    (_, indice) => pedidosOrdenados.slice(indice * PEDIDOS_POR_PAGINA, (indice + 1) * PEDIDOS_POR_PAGINA),
  ), [pedidosOrdenados]);
  const totalPaginas = paginas.length;
  const paginaActual = Math.min(pagina, Math.max(0, totalPaginas - 1));
  const inicio = paginaActual * PEDIDOS_POR_PAGINA;
  const pedidosVisibles = paginas[paginaActual] ?? [];

  useEffect(() => {
    if (pagina !== paginaActual) setPagina(paginaActual);
  }, [pagina, paginaActual]);

  useEffect(() => {
    if (altoPagina > 0 && totalPaginas > 0) {
      scroll.current?.scrollTo({ y: paginaActual * altoPagina, animated: false });
    }
  }, [altoPagina, paginaActual, totalPaginas]);

  const cargar = useCallback(async () => {
    setError('');
    try { setPedidos(await getPedidosSector(tipo)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los pedidos.'); }
    finally { setLoading(false); }
  }, [tipo]);

  useEffect(() => {
    if (mode !== 'authenticated' || role !== esperado) return;
    const inicial = setTimeout(() => { void cargar(); }, 0);
    const canal = supabase.channel(`pedidos-sector-${tipo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => { void cargar(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_detalles' }, () => { void cargar(); })
      .subscribe();
    const intervalo = setInterval(() => { void cargar(); }, 10000);
    return () => { clearTimeout(inicial); clearInterval(intervalo); void supabase.removeChannel(canal); };
  }, [cargar, esperado, mode, role, tipo]);

  function actualizarPaginaDesdeScroll(y: number) {
    if (altoPagina <= 0 || totalPaginas === 0) return;
    const visible = Math.max(0, Math.min(totalPaginas - 1, Math.round(y / altoPagina)));
    setPagina((actual) => actual === visible ? actual : visible);
  }

  function irAPagina(destino: number) {
    const paginaDestino = Math.max(0, Math.min(totalPaginas - 1, destino));
    setPagina(paginaDestino);
    scroll.current?.scrollTo({ y: paginaDestino * altoPagina, animated: true });
  }

  async function avanzar(item: Item) {
    if (actualizando) return;
    const siguiente: EstadoItem = item.estado === 'pendiente' ? 'en_preparacion' : 'listo';
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
      <Pressable accessibilityRole="button" onPress={() => router.push(tipo === 'plato' ? '/productos/alta' : '/productos/alta-bebida')} className="rounded-xl border-2 border-white/70 bg-chido-cabecera px-4 py-3">
        <Text className="font-bold text-chido-texto-sobre-oscuro">{tipo === 'plato' ? 'Alta de platos' : 'Alta de bebidas'}</Text>
      </Pressable>
    </View>
    {loading ? <ActivityIndicator className="mt-8" size="large" color={colores.textoSobreOscuro} /> : error ? <View className="p-6"><Text className="text-center text-chido-texto-sobre-oscuro">{error}</Text><Pressable accessibilityRole="button" onPress={() => void cargar()} className="mt-4 rounded-xl bg-chido-cabecera p-4"><Text className="text-center font-bold text-chido-texto-sobre-oscuro">Reintentar</Text></Pressable></View> : <View className="flex-1">
      <ScrollView
        ref={scroll}
        className="flex-1"
        onLayout={(event) => setAltoPagina(Math.floor(event.nativeEvent.layout.height))}
        pagingEnabled
        snapToInterval={altoPagina}
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={100}
        onScroll={(event) => actualizarPaginaDesdeScroll(event.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(event) => actualizarPaginaDesdeScroll(event.nativeEvent.contentOffset.y)}
      >
        {altoPagina > 0 && (pedidosOrdenados.length === 0 ? <View style={{ height: altoPagina, paddingHorizontal: 20, paddingVertical: 12 }}>
          <View className="flex-1 items-center justify-center rounded-3xl border-2 border-white/60 bg-chido-cabecera px-8">
            <Ionicons name="restaurant-outline" size={58} color={colores.textoSobreOscuro} />
            <Text className="mt-4 text-center text-xl font-bold text-chido-texto-sobre-oscuro">Todavía no hay pedidos confirmados para este sector.</Text>
          </View>
        </View> : paginas.map((pedidosPagina, indicePagina) => <View key={`${indicePagina}-${pedidosPagina.map((pedido) => pedido.id).join('-')}`} style={{ height: altoPagina, paddingHorizontal: 16, paddingVertical: 8 }}>
          <View style={{ flex: 1, gap: 12 }}>
          {pedidosPagina.map((pedido) => <View key={pedido.id} className="flex-1 rounded-3xl border-2 border-white/75 bg-chido-cabecera p-4">
            <View className="flex-row items-center justify-between border-b border-white/30 pb-4">
              <View>
                <Text className="text-sm font-semibold text-chido-texto-secundario-sobre-oscuro">PEDIDO</Text>
                <Text className="text-3xl font-extrabold text-chido-texto-sobre-oscuro">Mesa {pedido.mesa_numero}</Text>
              </View>
              <View className="items-end">
                <Ionicons name="calendar-outline" size={20} color={colores.textoSecundarioSobreOscuro} />
                <Text className="mt-1 text-right text-xs font-bold text-chido-texto-secundario-sobre-oscuro">{fechaPedido(pedido.created_at)}</Text>
              </View>
            </View>

            <View className="mt-3 flex-1 justify-center gap-3">
              {pedido.detalles.map((detalle) => {
                const presentacion = PRESENTACION_ESTADO[detalle.estado];
                return <View key={detalle.id} style={{ width: '92%', alignSelf: 'center', backgroundColor: colores.cabecera, borderColor: 'rgba(255, 248, 236, 0.38)' }} className="rounded-2xl border p-3">
                  <View className="flex-row items-center gap-3">
                    {detalle.foto ? <Image source={{ uri: detalle.foto }} accessibilityLabel={detalle.nombre} style={{ width: 72, height: 72, borderRadius: 14 }} resizeMode="cover" /> : <View className="h-[72px] w-[72px] items-center justify-center rounded-2xl bg-chido-cabecera"><Ionicons name={tipo === 'plato' ? 'restaurant-outline' : 'wine-outline'} size={38} color={colores.textoSobreOscuro} /></View>}
                    <View className="flex-1">
                      <Text className="text-xl font-extrabold text-chido-texto-sobre-oscuro">{detalle.cantidad} × {detalle.nombre}</Text>
                      <View className="mt-2 flex-row items-center self-start rounded-full px-3 py-1" style={{ backgroundColor: `${presentacion.color}30` }}>
                        <Ionicons name={presentacion.icono} size={18} color={presentacion.color} />
                        <Text className="ml-2 font-extrabold text-chido-texto-sobre-oscuro">{presentacion.texto}</Text>
                      </View>
                    </View>
                  </View>
                  {detalle.estado !== 'listo' ? <Pressable
                    disabled={actualizando !== null}
                    accessibilityRole="button"
                    accessibilityLabel={detalle.estado === 'pendiente' ? `Comenzar preparación de ${detalle.nombre}` : `Marcar ${detalle.nombre} como listo`}
                    onPress={() => void avanzar(detalle)}
                    className={`mt-4 min-h-14 flex-row items-center justify-center rounded-xl border-2 border-white/75 px-4 ${detalle.estado === 'pendiente' ? 'bg-chido-acento' : 'bg-chido-exito'}`}
                  >
                    <Ionicons name={detalle.estado === 'pendiente' ? 'play-circle-outline' : 'checkmark-done-circle-outline'} size={24} color={colores.textoSobreOscuro} />
                    <Text className="ml-2 text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">{actualizando === detalle.id ? 'Actualizando…' : detalle.estado === 'pendiente' ? 'Comenzar preparación' : 'Marcar como listo'}</Text>
                  </Pressable> : <View className="mt-4 min-h-14 flex-row items-center justify-center rounded-xl border-2 border-white/45 bg-chido-exito px-4">
                    <Ionicons name="checkmark-done-circle" size={24} color={colores.textoSobreOscuro} />
                    <Text className="ml-2 text-lg font-extrabold text-chido-texto-sobre-oscuro">Producto listo</Text>
                  </View>}
                </View>;
              })}
            </View>
          </View>)}
          </View>
        </View>))}
      </ScrollView>

      {totalPaginas > 0 && <View className="gap-2 px-5 pb-3 pt-2">
        <Text accessibilityLiveRegion="polite" className="text-center text-sm font-extrabold text-chido-texto-sobre-oscuro">
          Pedidos {inicio + 1}–{Math.min(inicio + PEDIDOS_POR_PAGINA, pedidosOrdenados.length)} de {pedidosOrdenados.length} · Página {paginaActual + 1} de {totalPaginas}
        </Text>
        <Text className="text-center text-sm text-chido-texto-secundario-sobre-oscuro">Deslizá para recorrer los pedidos.</Text>
        <View className="flex-row gap-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Página anterior de pedidos" disabled={paginaActual === 0} onPress={() => irAPagina(paginaActual - 1)} className={`min-h-12 flex-1 justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento px-2 py-2 ${paginaActual === 0 ? 'opacity-50' : ''}`}>
            <Text className="text-center font-bold text-chido-texto-sobre-oscuro">‹ Anterior</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Página siguiente de pedidos" disabled={paginaActual >= totalPaginas - 1} onPress={() => irAPagina(paginaActual + 1)} className={`min-h-12 flex-1 justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento px-2 py-2 ${paginaActual >= totalPaginas - 1 ? 'opacity-50' : ''}`}>
            <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Siguiente ›</Text>
          </Pressable>
        </View>
      </View>}
    </View>}
  </View>;
}
