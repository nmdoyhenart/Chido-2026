import { useEffect, useRef, useState } from 'react';
import { Image, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { useAppSession } from '../../contexts/AppSessionContext';
import { confirmarRecepcionPedido, getEstadoPedido, getEstadoPedidoAnonimo, suscribirEstadoPedido } from '../../services/pedidos.service';
import { colores } from '../../theme/colores';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const textosEstado: Record<string, string> = {
  pendiente_mozo: 'Esperando confirmación del mozo.',
  confirmado: 'Pedido confirmado. En preparación.',
  en_preparacion: 'Cocina y bar están preparando tu pedido.',
  entregado: 'El mozo indicó que ya entregó el pedido. Confirmá cuando lo tengas.',
  recibido: '¡Recepción confirmada! Ya podés disfrutar tu pedido.',
  rechazado: 'El mozo rechazó el pedido. Podés cambiar productos o cantidades y volver a enviarlo.',
};

export default function EstadoPedido() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { usuario } = useAppSession();
  const params = useLocalSearchParams();
  const pedidoId = Array.isArray(params.pedidoId) ? params.pedidoId[0] : params.pedidoId;
  const rawAnonimoId = Array.isArray(params.clienteAnonimoId) ? params.clienteAnonimoId[0] : params.clienteAnonimoId;
  const clienteAnonimoId = !usuario?.id && rawAnonimoId ? rawAnonimoId : undefined;
  const manualView = Array.isArray(params.manualView) ? params.manualView[0] : params.manualView;
  const [estado, setEstado] = useState<string>('pendiente_mozo');
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const haRedirigidoRef = useRef(false);

  useEffect(() => {
    if (!pedidoId) return;

    const redirigirSiCorresponde = (estadoActual: string) => {
      if (haRedirigidoRef.current || manualView === 'true' || estadoActual === 'pendiente_mozo' || estadoActual === 'rechazado' || estadoActual === 'entregado') return;
      haRedirigidoRef.current = true;
      router.replace({ pathname: '/cliente/pedido-realizado', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } });
    };

    const consultarEstado = async () => {
      try {
        const estadoActual = clienteAnonimoId
          ? await getEstadoPedidoAnonimo(clienteAnonimoId, pedidoId)
          : await getEstadoPedido(pedidoId);
        setEstado(estadoActual);
        redirigirSiCorresponde(estadoActual);
      } catch (caught) {
        console.error(caught);
      }
    };

    void consultarEstado();
    const intervalo = setInterval(() => { void consultarEstado(); }, 5000);
    const desuscribir = clienteAnonimoId ? () => {} : suscribirEstadoPedido(pedidoId, (nuevoEstado) => {
      setEstado(nuevoEstado);
      redirigirSiCorresponde(nuevoEstado);
    });

    return () => {
      clearInterval(intervalo);
      desuscribir();
    };
  }, [clienteAnonimoId, manualView, pedidoId, router]);

  async function confirmarRecepcion() {
    if (!pedidoId || cargandoAccion) return;
    setCargandoAccion(true);
    setError(null);
    try {
      await confirmarRecepcionPedido(pedidoId, clienteAnonimoId);
      setEstado('recibido');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo confirmar la recepción.');
      Vibration.vibrate(180);
    } finally {
      setCargandoAccion(false);
    }
  }

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role="Tu Pedido" />
      <View className="flex-1" style={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
        {/* La imagen toma solo el alto que sobra; textos y botones siempre quedan visibles. */}
        <View className="flex-1 items-center justify-center" style={{ minHeight: 0 }}>
        {estado === 'pendiente_mozo' || estado === 'confirmado' ? (
          <Image source={require('../../../assets/images/mascota-espera.png')} style={{ width: '100%', height: '100%', maxHeight: 350 }} resizeMode="contain" />
        ) : (
          <Ionicons name="restaurant-outline" size={80} color={colores.textoSobreOscuro} />
        )}
        </View>
        <View className="items-center">
        <Text className="mb-2 mt-4 text-center text-3xl font-bold text-chido-texto-sobre-oscuro">Estado del Pedido</Text>
        <Text className="mt-2 text-center text-xl font-bold text-chido-texto-secundario-sobre-oscuro">{textosEstado[estado] ?? 'Actualizando el estado del pedido.'}</Text>
        {error && <View className="mt-4 rounded-2xl bg-chido-error p-4"><Text className="text-center font-bold text-chido-texto-sobre-oscuro">{error}</Text></View>}
        {estado === 'entregado' && (
          <TouchableOpacity className="mt-5 w-full rounded-xl border-2 border-white/70 bg-chido-exito p-4" onPress={() => void confirmarRecepcion()} disabled={cargandoAccion}>
            <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">{cargandoAccion ? 'Confirmando recepción…' : 'Confirmar recepción del pedido'}</Text>
          </TouchableOpacity>
        )}
        {manualView === 'true' && (
          <TouchableOpacity className="mt-5 w-full rounded-xl bg-chido-cabecera p-4" onPress={() => router.back()}>
            <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Volver</Text>
          </TouchableOpacity>
        )}
        {estado === 'rechazado' && (
          <TouchableOpacity className="mt-5 w-full rounded-xl bg-chido-cabecera p-4" onPress={() => router.replace({ pathname: '/cliente/menu', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } })}>
            <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Modificar pedido</Text>
          </TouchableOpacity>
        )}
        </View>
      </View>
    </View>
  );
}
