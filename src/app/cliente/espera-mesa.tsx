import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { QRScanner } from '../../components/ui/QRScanner';
import { useAppSession } from '../../contexts/AppSessionContext';
import { confirmarMesaPorQr, obtenerEstadoSolicitudMesa, type EstadoSolicitudMesa } from '../../services/mesas';
import { colores } from '../../theme/colores';

export default function EsperaMesaCliente() {
  const router = useRouter();
  const { usuario } = useAppSession();
  const clienteId = usuario?.id;
  const [estado, setEstado] = useState<EstadoSolicitudMesa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

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
      <Header userName="Cliente" role="Mesa" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
        {!sinSolicitud ? <Image source={mesa ? require('../../../assets/images/mascota-mesa-asignada.png') : require('../../../assets/images/mascota-espera-mesa.png')} resizeMode="contain" style={{ width: '100%', height: 370, alignSelf: 'center' }} /> : <View className="mb-8 items-center"><View className="h-28 w-28 items-center justify-center rounded-3xl bg-chido-acento"><Ionicons name="time-outline" size={56} color={colores.textoSecundarioAlternativo} /></View></View>}
        <Text className="text-center text-5xl font-extrabold text-chido-texto-sobre-oscuro">{titulo}</Text>
        <Text className="mt-5 text-center font-bold text-chido-texto-secundario-sobre-oscuro" style={{ fontSize: 28, lineHeight: 36 }}>{descripcion}</Text>
        {aviso && <View className="mt-6 rounded-2xl bg-chido-error p-4"><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{aviso}</Text></View>}
        {mesa ? <Pressable accessibilityRole="button" accessibilityLabel="Escanear el código QR de mi mesa para ingresar" onPress={() => setScannerVisible(true)} className="mt-10 min-h-28 flex-row items-center justify-center rounded-3xl px-7" style={{ backgroundColor: colores.cabecera }}><Ionicons name="qr-code-outline" size={46} color={colores.textoSobreOscuro} /><Text className="ml-4 text-center text-3xl font-extrabold text-chido-texto-sobre-oscuro">Escanear código QR</Text></Pressable> : actualizando ? <ChidoLoader mensaje="Actualizando estado…" /> : !sinSolicitud && <Pressable accessibilityRole="button" onPress={() => void consultarEstado(true)} className="mt-10 min-h-28 flex-row items-center justify-center rounded-3xl px-7" style={{ backgroundColor: colores.cabecera }}><Ionicons name="refresh-outline" size={42} color={colores.textoSobreOscuro} /><Text className="ml-4 text-center text-3xl font-extrabold text-chido-texto-sobre-oscuro">Actualizar estado</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={() => router.back()} className="mt-5 min-h-28 flex-row items-center justify-center rounded-3xl px-7" style={{ backgroundColor: colores.cabecera }}><Ionicons name="arrow-back-outline" size={38} color={colores.textoSobreOscuro} /><Text className="ml-3 text-center text-3xl font-extrabold text-chido-texto-sobre-oscuro">Volver a Inicio</Text></Pressable>
      </ScrollView>
      <QRScanner visible={scannerVisible} proposito="mesa" onScan={confirmarMesa} onClose={() => setScannerVisible(false)} />
    </SafeAreaView>
  );
}
