import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { ResultadoModal } from '../../components/ui/ResultadoModal';
import { useAppSession } from '../../contexts/AppSessionContext';
import { useAltoDisponible } from '../../hooks/useAltoDisponible';
import { verificarEncuesta } from '../../services/encuestas.service';
import { puedeJugarPedido } from '../../services/juegos';
import { confirmarRecepcionPedido, getEstadoPedido, getEstadoPedidoAnonimo, suscribirEstadoPedido } from '../../services/pedidos.service';
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
  const [estadoPedido, setEstadoPedido] = useState<string | null>(null);
  const [juegosHabilitados, setJuegosHabilitados] = useState(false);
  const estadoLegible: Record<string, string> = {
    pendiente_mozo: 'Esperando confirmación del mozo',
    confirmado: 'Pedido confirmado · enviado a los sectores',
    en_preparacion: 'Tu pedido está en preparación',
    entregado: 'El mozo marcó el pedido como entregado',
    recibido: 'Recepción confirmada',
    rechazado: 'Pedido rechazado · podés modificarlo',
  };

  const [confirmandoRecepcion, setConfirmandoRecepcion] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const { alMedir, compacto, muyCompacto } = useAltoDisponible();
  const espacio = muyCompacto ? 8 : compacto ? 10 : 14;
  // Las tarjetas se reparten el alto disponible: sin scroll y sin superponerse.
  const tarjeta = { flexGrow: 1, flexBasis: 0, justifyContent: 'center' as const, paddingHorizontal: compacto ? 16 : 24, paddingVertical: muyCompacto ? 4 : compacto ? 8 : 16 };
  const tituloTarjeta = muyCompacto ? { fontSize: 24, lineHeight: 30 } : compacto ? { fontSize: 28, lineHeight: 34 } : { fontSize: 34, lineHeight: 40 };
  const iconoTarjeta = muyCompacto ? 36 : compacto ? 44 : 52;

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
        const estadoActual = await (clienteAnonimoId ? getEstadoPedidoAnonimo(clienteAnonimoId, pedidoId) : getEstadoPedido(pedidoId));
        const puedeJugar = usuario?.id && !clienteAnonimoId
          ? await puedeJugarPedido(usuario.id, pedidoId)
          : false;
        if (activa) {
          setEstadoPedido(estadoActual);
          setJuegosHabilitados(puedeJugar);
        }
      } catch (caught) {
        console.error(caught);
      } finally {
        if (activa) setCargando(false);
      }
    };
    void consultarEstado();
    const intervalo = setInterval(() => { void consultarEstado(); }, 5000);
    const desuscribir = clienteAnonimoId ? () => {} : suscribirEstadoPedido(pedidoId, (nuevoEstado) => {
      if (activa) setEstadoPedido(nuevoEstado);
    });
    return () => {
      activa = false;
      clearInterval(intervalo);
      desuscribir();
    };
  }, [clienteAnonimoId, pedidoId, usuario?.id]);

  if (cargando) return <View className="flex-1 items-center justify-center bg-chido-fondo"><ChidoLoader mensaje="Consultando tu pedido…" /></View>;

  function abrirCuenta() {
    if (!pedidoId) return;
    router.push({ pathname: '/cliente/pedir-cuenta', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } });
  }

  async function confirmarRecepcion() {
    if (!pedidoId || confirmandoRecepcion) return;
    setConfirmandoRecepcion(true);
    try {
      await confirmarRecepcionPedido(pedidoId, clienteAnonimoId);
      setEstadoPedido('recibido');
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo confirmar la recepción del pedido.');
    } finally {
      setConfirmandoRecepcion(false);
    }
  }

  const puedePedirCuenta = estadoPedido === 'recibido';

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role="Tu Mesa" />
      <View
        className="flex-1"
        onLayout={alMedir}
        style={{
          gap: espacio,
          paddingHorizontal: 16,
          paddingTop: espacio,
          paddingBottom: Math.max(insets.bottom, espacio)
        }}
      >
        <View accessibilityLiveRegion="polite" className={`rounded-xl border border-white/60 bg-chido-superficieTerracota px-4 ${compacto ? 'py-2' : 'py-3'}`}>
          <Text className="text-sm font-semibold text-chido-texto-secundario-sobre-oscuro">Estado de tu pedido</Text>
          <Text className="mt-1 text-lg font-extrabold text-chido-texto-sobre-oscuro">
            {estadoPedido ? estadoLegible[estadoPedido] ?? 'Actualizando estado…' : 'Actualizando estado…'}
          </Text>
        </View>

        {estadoPedido === 'entregado' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirmar recepción del pedido"
            disabled={confirmandoRecepcion}
            className="rounded-2xl border-2 border-white/70 bg-chido-exito"
            style={tarjeta}
            onPress={() => void confirmarRecepcion()}
          >
            {confirmandoRecepcion ? (
              <ChidoLoader mensaje="Confirmando recepción…" compacto />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle-outline" size={iconoTarjeta}color={colores.textoSobreOscuro} />
                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: tituloTarjeta.fontSize - 6, lineHeight: tituloTarjeta.lineHeight - 6 }}>Confirmar recepción</Text>
                  <Text className="mt-1 text-base font-bold text-chido-texto-secundario-sobre-oscuro">Confirmá que recibiste tu pedido</Text>
                </View>
                <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
              </View>
            )}
          </Pressable>
        )}

        {!clienteAnonimoId && <Pressable
          accessibilityRole="button"
          accessibilityLabel={juegosHabilitados ? 'Juegos con premios' : 'Juegos bloqueados hasta confirmar el pedido o solicitar la cuenta'}
          accessibilityState={{ disabled: !juegosHabilitados }}
          disabled={!juegosHabilitados}
          className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${juegosHabilitados ? '' : 'opacity-60'}`}
          style={tarjeta}
          onPress={() => juegosHabilitados && router.push({ pathname: '/cliente/juegos', params: { pedidoId } })}
        >
          <View className="flex-row items-center">
            <Ionicons name={juegosHabilitados ? 'game-controller-outline' : 'lock-closed-outline'} size={iconoTarjeta}color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={tituloTarjeta}>Jugar</Text>
              <Text className="mt-1 text-base font-bold text-chido-texto-secundario-sobre-oscuro">{juegosHabilitados ? 'Ganá descuentos para tu cuenta' : 'Disponible al confirmar; se bloquea al pedir la cuenta'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
          </View>
        </Pressable>}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Encuestas"
          className="rounded-2xl border-2 border-white/70 bg-chido-cabecera"
          style={tarjeta}
          onPress={() => router.push({ pathname: '/cliente/encuestas', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}), ...(estadoPedido ? { estadoPedido } : {}) } })}
        >
          <View className="flex-row items-center">
            <Ionicons name="star-outline" size={iconoTarjeta} color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={tituloTarjeta}>Encuestas</Text>
              <Text className="mt-1 text-base font-bold text-chido-texto-secundario-sobre-oscuro">
                {encuestaCompletada ? 'Mirá opiniones y estadísticas' : 'Dejanos tu opinión o mirá resultados'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pedir la cuenta"
          accessibilityState={{ disabled: !puedePedirCuenta }}
          disabled={!puedePedirCuenta}
          className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${puedePedirCuenta ? '' : 'opacity-60'}`}
          style={tarjeta}
          onPress={abrirCuenta}
        >
          <View className="flex-row items-center">
            <Ionicons name="receipt-outline" size={iconoTarjeta}color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={tituloTarjeta}>
                Pedir cuenta
              </Text>
              <Text className="mt-1 text-base font-bold text-chido-texto-sobre-oscuro">
                {puedePedirCuenta ? 'Escaneá la propina y pagá tu cuenta' : 'Confirmá primero la recepción del pedido'}
              </Text>
            </View>
            <Ionicons name={puedePedirCuenta ? 'chevron-forward' : 'lock-closed-outline'} size={30} color={colores.textoSobreOscuro} />
          </View>
        </Pressable>
      </View>
      <ResultadoModal visible={Boolean(aviso)} tipo="error" titulo="No pudimos confirmar la recepción" mensaje={aviso ?? ''} accion="Entendido" onClose={() => setAviso(null)} />
    </View>
  );
}
