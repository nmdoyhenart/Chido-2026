import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { QRScanner } from '../../components/ui/QRScanner';
import { useAppSession } from '../../contexts/AppSessionContext';
import { useAltoDisponible } from '../../hooks/useAltoDisponible';
import { useNombreCliente } from '../../hooks/useNombreCliente';
import { confirmarMesaPorQr, obtenerEstadoSolicitudMesa, type EstadoSolicitudMesa } from '../../services/mesas';
import { colores } from '../../theme/colores';

export default function EsperaMesaCliente() {
  const router = useRouter();
  const { usuario } = useAppSession();
  const { nombreCliente } = useNombreCliente();
  const clienteId = usuario?.id;
  const [estado, setEstado] = useState<EstadoSolicitudMesa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const { alMedir, compacto, muyCompacto } = useAltoDisponible();
  const estiloTitulo = muyCompacto ? { fontSize: 30, lineHeight: 36 } : compacto ? { fontSize: 36, lineHeight: 42 } : { fontSize: 48, lineHeight: 54 };
  const estiloDescripcion = muyCompacto ? { fontSize: 18, lineHeight: 24 } : compacto ? { fontSize: 22, lineHeight: 28 } : { fontSize: 28, lineHeight: 36 };
  const estiloBoton = { backgroundColor: colores.cabecera, minHeight: muyCompacto ? 60 : compacto ? 72 : 112 };
  const textoBoton = `ml-3 text-center font-extrabold text-chido-texto-sobre-oscuro ${compacto ? 'text-2xl' : 'text-3xl'}`;
  const iconoBoton = compacto ? 32 : 42;

  const consultarEstado = useCallback(async (manual = false) => {
    if (!clienteId) {
      setAviso('No pudimos identificar tu cuenta para consultar la solicitud.');
      setCargando(false);
      return;
    }
    if (manual) setActualizando(true);
    try {
      setAviso(null);
      setEstado(await obtenerEstadoSolicitudMesa(clienteId));
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo consultar el estado de la mesa.');
      Vibration.vibrate(180);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [clienteId]);

  useFocusEffect(useCallback(() => {
    void consultarEstado();
    const intervalo = setInterval(() => void consultarEstado(), 10000);
    return () => clearInterval(intervalo);
  }, [consultarEstado]));

  async function confirmarMesa(rawQr: string) {
    if (!clienteId) throw new Error('No pudimos identificar tu cuenta para confirmar la mesa.');
    const mesaConfirmada = await confirmarMesaPorQr(clienteId, rawQr);
    router.replace({ pathname: '/cliente/menu', params: { mesaId: mesaConfirmada.id } });
  }

  if (cargando) return <View className="flex-1 justify-center bg-chido-fondo"><ChidoLoader mensaje="Consultando tu solicitud…" /></View>;

  const mesa = estado?.mesa;
  const sinSolicitud = !mesa && !estado?.enEspera;
  const titulo = mesa ? `¡Te asignaron la mesa ${mesa.numero}!` : sinSolicitud ? 'Sin solicitud activa' : '¡Ya estás anotado!';
  const descripcion = mesa
    ? 'Escaneá el código QR de tu mesa para ingresar y hacer tu pedido.'
    : sinSolicitud
      ? 'Volvé a Inicio para solicitar una mesa.'
      : 'Estás en la lista de espera. En cuanto el metre te asigne una mesa, vas a poder ingresar.';
  return (
    <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
      <Header userName={nombreCliente} role="Mesa" />
      {/* SafeAreaView ya reserva el área inferior (botones de Android / barra de inicio de iPhone). */}
      <View className="flex-1" onLayout={alMedir} style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        {/* La mascota se adapta al alto que sobra para que textos y botones nunca se pisen. */}
        <View className="flex-1 items-center justify-center" style={{ minHeight: 0 }}>
          {!sinSolicitud ? <Image source={mesa ? require('../../../assets/images/mascota-mesa-asignada.png') : require('../../../assets/images/mascota-espera-mesa.png')} resizeMode="contain" style={{ width: '100%', height: '100%', maxHeight: 370 }} /> : <View className={`items-center justify-center rounded-3xl bg-chido-acento ${compacto ? 'h-20 w-20' : 'h-28 w-28'}`}><Ionicons name="time-outline" size={compacto ? 40 : 56} color={colores.textoSecundarioAlternativo} /></View>}
        </View>
        <Text className="mt-2 text-center font-extrabold text-chido-texto-sobre-oscuro" style={estiloTitulo}>{titulo}</Text>
        <Text className={`${compacto ? 'mt-2' : 'mt-5'} text-center font-bold text-chido-texto-secundario-sobre-oscuro`} style={estiloDescripcion}>{descripcion}</Text>
        {aviso && <View className={`${compacto ? 'mt-3 p-2' : 'mt-6 p-4'} rounded-2xl bg-chido-error`}><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{aviso}</Text></View>}
        {mesa ? <Pressable accessibilityRole="button" accessibilityLabel="Escanear el código QR de mi mesa para ingresar" onPress={() => setScannerVisible(true)} className={`${compacto ? 'mt-4' : 'mt-10'} flex-row items-center justify-center rounded-3xl px-7`} style={estiloBoton}><Ionicons name="qr-code-outline" size={iconoBoton + 4} color={colores.textoSobreOscuro} /><Text className={textoBoton}>Escanear código QR</Text></Pressable> : actualizando ? <ChidoLoader mensaje="Actualizando estado…" compacto={compacto} /> : !sinSolicitud && <Pressable accessibilityRole="button" onPress={() => void consultarEstado(true)} className={`${compacto ? 'mt-4' : 'mt-10'} flex-row items-center justify-center rounded-3xl px-7`} style={estiloBoton}><Ionicons name="refresh-outline" size={iconoBoton} color={colores.textoSobreOscuro} /><Text className={textoBoton}>Actualizar estado</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={() => router.back()} className={`${compacto ? 'mt-3' : 'mt-5'} flex-row items-center justify-center rounded-3xl px-7`} style={estiloBoton}><Ionicons name="arrow-back-outline" size={iconoBoton - 4} color={colores.textoSobreOscuro} /><Text className={textoBoton}>Volver a Inicio</Text></Pressable>
      </View>
      <QRScanner visible={scannerVisible} proposito="mesa" onScan={confirmarMesa} onClose={() => setScannerVisible(false)} />
    </SafeAreaView>
  );
}
