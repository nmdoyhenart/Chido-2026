import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { QRScanner } from '../../components/ui/QRScanner';
import { useAppSession } from '../../contexts/AppSessionContext';
import { useAltoDisponible } from '../../hooks/useAltoDisponible';
import { obtenerPedidoParaJuegos } from '../../services/juegos';
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
  const [pedidoConJuegos, setPedidoConJuegos] = useState<{ id: string; descuento_porcentaje: number } | null>(null);
  const [pedidoActivo, setPedidoActivo] = useState<{ id: string; estado: string } | null>(null);
  const [cargandoPedido, setCargandoPedido] = useState(true);
  const [errorPedido, setErrorPedido] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { alMedir, compacto, muyCompacto } = useAltoDisponible();
  const espacio = muyCompacto ? 8 : compacto ? 10 : 14;
  // Las tarjetas se reparten el alto disponible: sin scroll y sin superponerse.
  const tarjeta = { flexGrow: 1, flexBasis: 0, justifyContent: 'center' as const, paddingHorizontal: compacto ? 16 : 24, paddingVertical: muyCompacto ? 4 : compacto ? 8 : 16 };
  const tituloTarjeta = muyCompacto ? { fontSize: 24, lineHeight: 30 } : compacto ? { fontSize: 28, lineHeight: 34 } : { fontSize: 34, lineHeight: 40 };
  const iconoTarjeta = muyCompacto ? 36 : compacto ? 44 : 52;

  useFocusEffect(useCallback(() => {
    let activa = true;
    if (!clienteId) {
      setPedidoConJuegos(null);
      setPedidoActivo(null);
      setCargandoPedido(false);
      return () => { activa = false; };
    }

    setCargandoPedido(true);
    setErrorPedido(null);
    void Promise.all([obtenerPedidoActivoCliente(clienteId), obtenerPedidoParaJuegos(clienteId)]).then(([activo, confirmado]) => {
      if (!activa) return;
      setPedidoActivo(activo);
      setPedidoConJuegos(confirmado);
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
      <View
        className="flex-1"
        onLayout={alMedir}
        style={{ gap: espacio, paddingHorizontal: 16, paddingTop: espacio, paddingBottom: Math.max(insets.bottom, espacio) }}
      >
        <Text className={`${muyCompacto ? 'text-2xl' : 'text-3xl'} font-bold text-chido-texto-sobre-oscuro`} style={{ paddingVertical: compacto ? 2 : 10 }}>Hola, {primerNombre}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Escanear código QR de la mesa" className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta} onPress={() => setScannerVisible(true)}>
          <View className="flex-row items-center">
            <Ionicons name="qr-code-outline" size={iconoTarjeta}color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1"><Text className="font-extrabold text-chido-texto-sobre-oscuro" style={tituloTarjeta}>Escanear QR</Text></View>
            <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver encuestas" className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta} onPress={() => router.push('/encuestas/previas')}>
          <View className="flex-row items-center">
            <Ionicons name="bar-chart-outline" size={iconoTarjeta}color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1"><Text className="font-extrabold text-chido-texto-sobre-oscuro" style={tituloTarjeta}>Ver encuestas</Text></View>
          </View>
        </Pressable>
        {cargandoPedido ? (
          // Ocupa el lugar de las dos tarjetas que reemplaza para que el resto no salte.
          <View style={{ flexGrow: 2, flexBasis: 0, justifyContent: 'center' }}>
            <ChidoLoader mensaje="Verificando tu pedido activo…" compacto={compacto} />
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
                accessibilityLabel={pedidoActivo ? pedidoActivo.estado === 'rechazado' ? 'Modificar pedido rechazado' : 'Ver mi pedido' : 'No hay un pedido activo'}
               accessibilityState={{ disabled: !pedidoActivo }}
               disabled={!pedidoActivo}
               className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${pedidoActivo ? '' : 'opacity-60'}`}
               style={tarjeta}
                onPress={() => pedidoActivo && router.push(
                  pedidoActivo.estado === 'rechazado'
                    ? { pathname: '/cliente/estado-pedido', params: { pedidoId: pedidoActivo.id } }
                    : { pathname: '/cliente/pedido-realizado', params: { pedidoId: pedidoActivo.id } }
                )}
            >
              <View className="flex-row items-center">
                <Ionicons name="receipt-outline" size={iconoTarjeta}color={colores.textoSobreOscuro} />
                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={tituloTarjeta}>{pedidoActivo?.estado === 'rechazado' ? 'Modificar pedido' : 'Mi pedido'}</Text>
                </View>
                 <Ionicons name={pedidoActivo ? 'chevron-forward' : 'lock-closed-outline'} size={30} color={colores.textoSobreOscuro} />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pedidoConJuegos ? 'Abrir juegos y descuentos' : 'Juegos bloqueados hasta confirmar el pedido'}
              accessibilityState={{ disabled: !pedidoConJuegos }}
              disabled={!pedidoConJuegos}
              className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${pedidoConJuegos ? '' : 'opacity-60'}`}
              style={tarjeta}
              onPress={() => pedidoConJuegos && router.push({ pathname: '/cliente/juegos', params: { pedidoId: pedidoConJuegos.id } })}
            >
              <View className="flex-row items-center">
                <Ionicons name="game-controller-outline" size={iconoTarjeta}color={colores.textoSobreOscuro} />
                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={tituloTarjeta}>Juegos</Text>
                </View>
                <Ionicons name={pedidoConJuegos ? 'chevron-forward' : 'lock-closed-outline'} size={30} color={colores.textoSobreOscuro} />
              </View>
            </Pressable>
            {errorPedido && <View className={`rounded-2xl bg-chido-error ${compacto ? 'p-2' : 'p-4'}`}><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{errorPedido}</Text></View>}
          </>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Solicitar una mesa" disabled={solicitandoMesa} onPress={() => void solicitarUnaMesa()} className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta}>
          {solicitandoMesa ? <ChidoLoader mensaje="Enviando solicitud…" compacto /> :<View className="flex-row items-center">
            <Ionicons name="people-outline" size={iconoTarjeta}color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={tituloTarjeta}>Solicitar mesa</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
          </View>}
        </Pressable>
        {avisoMesa && <View className={`rounded-2xl bg-chido-error ${compacto ? 'p-2' : 'p-4'}`}><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{avisoMesa}</Text></View>}
      </View>
      <QRScanner visible={scannerVisible} proposito="mesa" onScan={confirmarMesa} onClose={() => setScannerVisible(false)} />
    </View>
  );
}
