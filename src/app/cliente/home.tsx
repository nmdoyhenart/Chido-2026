import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { QRScanner } from '../../components/ui/QRScanner';
import { useAppSession } from '../../contexts/AppSessionContext';
import { obtenerPedidoConfirmadoParaJuegos } from '../../services/juegos';
import { obtenerPedidoActivoCliente } from '../../services/pedidos.service';
import { confirmarMesaPorQr, consultarDisponibilidadMesaPorQr, solicitarMesa } from '../../services/mesas';
import { colores } from '../../theme/colores';

export default function HomeCliente() {
  const router = useRouter();
  const { usuario } = useAppSession();
  const clienteId = usuario?.id;
  const primerNombre = usuario?.nombres.trim().split(/\s+/)[0] || 'Cliente';
  const [scannerVisible, setScannerVisible] = useState(false);
  const [solicitandoMesa, setSolicitandoMesa] = useState(false);
  const [avisoMesa, setAvisoMesa] = useState<string | null>(null);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{ id: string; descuento_porcentaje: number } | null>(null);
  const [pedidoActivo, setPedidoActivo] = useState<{ id: string } | null>(null);
  const [cargandoPedido, setCargandoPedido] = useState(true);
  const [errorPedido, setErrorPedido] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [altoDisponible, setAltoDisponible] = useState(0);
  const compacto = altoDisponible > 0 && altoDisponible < 620;
  const espacio = compacto ? 10 : 14;
  const tarjeta = { flexGrow: 1, flexBasis: 0, minHeight: 112, justifyContent: 'center' as const, padding: compacto ? 16 : 24 };

  useFocusEffect(useCallback(() => {
    let activa = true;
    if (!clienteId) {
      setPedidoConfirmado(null);
      setPedidoActivo(null);
      setCargandoPedido(false);
      return () => { activa = false; };
    }

    setCargandoPedido(true);
    setErrorPedido(null);
    void Promise.all([obtenerPedidoActivoCliente(clienteId), obtenerPedidoConfirmadoParaJuegos(clienteId)]).then(([activo, confirmado]) => {
      if (!activa) return;
      setPedidoActivo(activo);
      setPedidoConfirmado(confirmado);
    }).catch((error: unknown) => {
      if (activa) {
        setErrorPedido(error instanceof Error ? error.message : 'No se pudo consultar tu pedido activo.');
        Vibration.vibrate(180);
      }
    }).finally(() => {
      if (activa) setCargandoPedido(false);
    });

    return () => { activa = false; };
  }, [clienteId]));

  async function confirmarMesa(rawQr: string) {
    if (!usuario?.id) throw new Error('Iniciá sesión con tu cuenta de cliente para confirmar la mesa.');
    try {
      const mesa = await confirmarMesaPorQr(usuario.id, rawQr);
      router.push({ pathname: '/cliente/menu', params: { mesaId: mesa.id } });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'Todavía no tenés una mesa asignada.') throw error;
      const mesa = await consultarDisponibilidadMesaPorQr(rawQr);
      if (mesa.disponibilidad !== 'vacía') throw error;
      setAvisoMesa(`La mesa ${mesa.numero} está libre nuevamente.`);
    }
  }

  async function solicitarUnaMesa() {
    if (!usuario?.id) {
      setAvisoMesa('No pudimos identificar tu cuenta para solicitar una mesa.');
      Vibration.vibrate(180);
      return;
    }
    setSolicitandoMesa(true);
    setAvisoMesa(null);
    try {
      await solicitarMesa(usuario);
      router.push('/cliente/espera-mesa');
    } catch (error) {
      setAvisoMesa(error instanceof Error ? error.message : 'No se pudo enviar la solicitud de mesa.');
      Vibration.vibrate(180);
    } finally {
      setSolicitandoMesa(false);
    }
  }

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role="Bienvenido" />
      <ScrollView
        className="flex-1"
        onLayout={({ nativeEvent }) => setAltoDisponible(nativeEvent.layout.height)}
        contentContainerStyle={{ flexGrow: 1, gap: espacio, paddingHorizontal: 16, paddingTop: espacio, paddingBottom: Math.max(insets.bottom, espacio) }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro" style={{ paddingVertical: compacto ? 6 : 10 }}>Hola, {primerNombre}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Escanear código QR de la mesa" className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta} onPress={() => setScannerVisible(true)}>
          <View className="flex-row items-center">
            <Ionicons name="qr-code-outline" size={52} color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1"><Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Escanear QR</Text></View>
            <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Escanear código QR para ver encuestas" className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta} onPress={() => router.push('/encuestas/acceso')}>
          <View className="flex-row items-center">
            <Ionicons name="bar-chart-outline" size={52} color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1"><Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Ver encuestas</Text></View>
          </View>
        </Pressable>
        {cargandoPedido ? (
          <ChidoLoader mensaje="Verificando tu pedido activo…" />
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
               accessibilityLabel={pedidoActivo ? 'Ver mi pedido' : 'No hay un pedido activo'}
               accessibilityState={{ disabled: !pedidoActivo }}
               disabled={!pedidoActivo}
               className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${pedidoActivo ? '' : 'opacity-60'}`}
               style={tarjeta}
               onPress={() => pedidoActivo && router.push({ pathname: '/cliente/pedido-realizado', params: { pedidoId: pedidoActivo.id } })}
            >
              <View className="flex-row items-center">
                <Ionicons name="receipt-outline" size={52} color={colores.textoSobreOscuro} />
                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Mi pedido</Text>
                </View>
                 <Ionicons name={pedidoActivo ? 'chevron-forward' : 'lock-closed-outline'} size={30} color={colores.textoSobreOscuro} />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pedidoConfirmado ? 'Abrir juegos y descuentos' : 'Juegos bloqueados hasta confirmar el pedido'}
              accessibilityState={{ disabled: !pedidoConfirmado }}
              disabled={!pedidoConfirmado}
              className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${pedidoConfirmado ? '' : 'opacity-60'}`}
              style={tarjeta}
              onPress={() => pedidoConfirmado && router.push({ pathname: '/cliente/juegos', params: { pedidoId: pedidoConfirmado.id } })}
            >
              <View className="flex-row items-center">
                <Ionicons name="game-controller-outline" size={52} color={colores.textoSobreOscuro} />
                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Juegos</Text>
                </View>
                <Ionicons name={pedidoConfirmado ? 'chevron-forward' : 'lock-closed-outline'} size={30} color={colores.textoSobreOscuro} />
              </View>
            </Pressable>
            {errorPedido && <View className="rounded-2xl bg-chido-error p-4"><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{errorPedido}</Text></View>}
          </>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Solicitar una mesa" disabled={solicitandoMesa} onPress={() => void solicitarUnaMesa()} className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta}>
          {solicitandoMesa ? <ChidoLoader mensaje="Enviando solicitud…" /> : <View className="flex-row items-center">
            <Ionicons name="people-outline" size={52} color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Solicitar mesa</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
          </View>}
        </Pressable>
        {avisoMesa && <View className="rounded-2xl bg-chido-error p-4"><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{avisoMesa}</Text></View>}
      </ScrollView>
      <QRScanner visible={scannerVisible} proposito="mesa" onScan={confirmarMesa} onClose={() => setScannerVisible(false)} />
    </View>
  );
}
