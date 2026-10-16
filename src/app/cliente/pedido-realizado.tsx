import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { useAppSession } from '../../contexts/AppSessionContext';
import { verificarEncuesta } from '../../services/encuestas.service';
import { getEstadoPedido, getEstadoPedidoAnonimo, suscribirEstadoPedido } from '../../services/pedidos.service';
import { colores } from '../../theme/colores';

export default function PedidoRealizado() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { usuario } = useAppSession();
  const params = useLocalSearchParams();
  const pedidoId = Array.isArray(params.pedidoId) ? params.pedidoId[0] : params.pedidoId;
  const rawAnonimoId = Array.isArray(params.clienteAnonimoId) ? params.clienteAnonimoId[0] : params.clienteAnonimoId;
  const clienteAnonimoId = !usuario?.id && rawAnonimoId ? rawAnonimoId : undefined;
  const [cargando, setCargando] = useState(() => Boolean(pedidoId));
  const [encuestaCompletada, setEncuestaCompletada] = useState(false);
  const [altoDisponible, setAltoDisponible] = useState(0);
  const compacto = altoDisponible > 0 && altoDisponible < 620;
  const espacio = compacto ? 10 : 14;
  const tarjeta = { flexGrow: 1, flexBasis: 0, minHeight: 112, justifyContent: 'center' as const, padding: compacto ? 16 : 24 };

  useFocusEffect(useCallback(() => {
    if (!pedidoId) return;
    void AsyncStorage.getItem(`encuesta_completada_${pedidoId}`).then((valor) => {
      if (valor === 'true') setEncuestaCompletada(true);
      else void verificarEncuesta(pedidoId).then(setEncuestaCompletada).catch(() => setEncuestaCompletada(false));
    });
  }, [pedidoId]));

  useEffect(() => {
    if (!pedidoId) return;
    let activa = true;
    const consultarEstado = async () => {
      try {
        await (clienteAnonimoId ? getEstadoPedidoAnonimo(clienteAnonimoId, pedidoId) : getEstadoPedido(pedidoId));
      } catch (caught) {
        console.error(caught);
      } finally {
        if (activa) setCargando(false);
      }
    };
    void consultarEstado();
    const intervalo = setInterval(() => { void consultarEstado(); }, 5000);
    const desuscribir = clienteAnonimoId ? () => {} : suscribirEstadoPedido(pedidoId, () => { void consultarEstado(); });
    return () => {
      activa = false;
      clearInterval(intervalo);
      desuscribir();
    };
  }, [clienteAnonimoId, pedidoId]);

  if (cargando) return <View className="flex-1 items-center justify-center bg-chido-fondo"><ChidoLoader mensaje="Consultando tu pedido…" /></View>;

  function abrirCuenta() {
    if (!pedidoId) return;
    router.push({ pathname: '/cliente/pedir-cuenta', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } });
  }

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role="Tu Mesa" />
      <ScrollView className="flex-1" onLayout={({ nativeEvent }) => setAltoDisponible(nativeEvent.layout.height)} contentContainerStyle={{ flexGrow: 1, gap: espacio, paddingHorizontal: 16, paddingTop: espacio, paddingBottom: Math.max(insets.bottom, espacio) }} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
        <Text className="mb-2 text-center text-3xl font-bold text-chido-texto-sobre-oscuro" style={{ paddingVertical: compacto ? 6 : 10 }}>¿Qué deseás hacer?</Text>
        {!clienteAnonimoId && <Pressable accessibilityRole="button" accessibilityLabel="Juegos con premios" className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta} onPress={() => router.push({ pathname: '/cliente/juegos', params: { pedidoId } })}><View className="flex-row items-center"><Ionicons name="game-controller-outline" size={52} color={colores.textoSobreOscuro} /><View className="ml-4 flex-1"><Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Jugar</Text><Text className="mt-1 text-base font-bold text-chido-texto-secundario-sobre-oscuro">Ganá descuentos para tu cuenta</Text></View><Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} /></View></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel="Completar encuesta de satisfacción" disabled={encuestaCompletada} className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${encuestaCompletada ? 'opacity-50' : ''}`} style={tarjeta} onPress={() => router.push({ pathname: '/cliente/encuesta', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } })}><View className="flex-row items-center"><Ionicons name="star-outline" size={52} color={colores.textoSobreOscuro} /><View className="ml-4 flex-1"><Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Encuesta</Text><Text className="mt-1 text-base font-bold text-chido-texto-secundario-sobre-oscuro">{encuestaCompletada ? '¡Gracias por tu opinión!' : 'Dejanos tu opinión'}</Text></View><Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} /></View></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Pedir la cuenta" className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta} onPress={abrirCuenta}><View className="flex-row items-center"><Ionicons name="receipt-outline" size={52} color={colores.textoSobreOscuro} /><View className="ml-4 flex-1"><Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Pedir cuenta</Text><Text className="mt-1 text-base font-bold text-chido-texto-secundario-sobre-oscuro">Escaneá la propina y pagá tu cuenta</Text></View><Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} /></View></Pressable>
      </ScrollView>
    </View>
  );
}
