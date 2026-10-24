import { useEffect, useRef, useState } from 'react';
import { Image, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { useAppSession } from '../../contexts/AppSessionContext';
import { confirmarRecepcionPedido, getEstadoPedido, getEstadoPedidoAnonimo, suscribirEstadoPedido } from '../../services/pedidos.service';
import { colores } from '../../theme/colores';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNombreCliente } from '../../hooks/useNombreCliente';
import { formatearRolMesa } from '../../utils/formatoMesa';
import { supabase } from '../../../lib/supabase';

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
  const { nombreCliente } = useNombreCliente(clienteAnonimoId);
  const [mesaNumero, setMesaNumero] = useState<number | null>(null);
  const [mesaTipo, setMesaTipo] = useState<string | null>(null);
  const [estado, setEstado] = useState<string>('pendiente_mozo');
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const haRedirigidoRef = useRef(false);

  useEffect(() => {
    if (!pedidoId) return;
    let activo = true;
    void supabase
      .from('pedidos')
      .select('mesas(numero, tipo)')
      .eq('id', pedidoId)
      .maybeSingle()
      .then(({ data }) => {
        if (!activo || !data?.mesas) return;
        const m = data.mesas as unknown as { numero: number; tipo: string };
        setMesaNumero(m.numero);
        setMesaTipo(m.tipo);
      });
    return () => { activo = false; };
  }, [pedidoId]);

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
      <Header userName={nombreCliente} role={formatearRolMesa(mesaNumero, mesaTipo, 'Tu Pedido')} />
      {estado === 'rechazado' ? (
        <View className="flex-1 justify-center px-5" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="w-full self-center rounded-3xl border-2 border-white/60 bg-chido-cabecera p-6" style={{ maxWidth: 560 }}>
            <View className="mb-5 h-20 w-20 self-center items-center justify-center rounded-full bg-chido-error/40">
              <Ionicons name="close-circle-outline" size={42} color={colores.textoSobreOscuro} />
            </View>
            <Text className="text-center text-3xl font-extrabold text-chido-texto-sobre-oscuro">Tu pedido fue rechazado</Text>
            <Text className="mt-3 text-center text-lg leading-7 text-chido-texto-secundario-sobre-oscuro">
              El mozo rechazo tu pedido. Podés cambiar los productos (o cantidades) y volver a enviarlo.
            </Text>
            {error && <View className="mt-4 rounded-2xl bg-chido-error p-4"><Text className="text-center font-bold text-chido-texto-sobre-oscuro">{error}</Text></View>}
            <TouchableOpacity
              accessibilityRole="button"
              className="mt-6 min-h-14 w-full flex-row items-center justify-center rounded-2xl border-2 border-white/70 bg-chido-acento px-4 py-3"
              onPress={() => router.replace({ pathname: '/cliente/menu', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } })}
            >
              <Ionicons name="create-outline" size={22} color={colores.textoSobreOscuro} />
              <Text className="ml-2 text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">Modificar pedido</Text>
            </TouchableOpacity>
            {manualView === 'true' && <TouchableOpacity className="mt-3 min-h-12 items-center justify-center rounded-2xl border border-white/50 px-4 py-2" onPress={() => router.back()}>
              <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Volver</Text>
            </TouchableOpacity>}
          </View>
        </View>
      ) : (
        <View className="flex-1 justify-center" style={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="items-center">
            {estado === 'pendiente_mozo' || estado === 'confirmado' ? (
              <Image
                source={require('../../../assets/images/mascota-espera.png')}
                style={{ width: '100%', height: '100%', maxHeight: 350 }}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="restaurant-outline" size={80} color={colores.textoSobreOscuro} />
            )}
            <Text className="mb-2 mt-3 text-center text-3xl font-bold text-chido-texto-sobre-oscuro">Estado del Pedido</Text>
            <Text className="mt-1 text-center text-xl font-bold text-chido-texto-secundario-sobre-oscuro">{textosEstado[estado] ?? 'Actualizando el estado del pedido.'}</Text>
            {error && <View className="mt-4 w-full rounded-2xl bg-chido-error p-4"><Text className="text-center font-bold text-chido-texto-sobre-oscuro">{error}</Text></View>}
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
          </View>
        </View>
      )}
    </View>
  );
}
