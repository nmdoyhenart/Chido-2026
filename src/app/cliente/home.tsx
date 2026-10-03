import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { QRScanner } from '../../components/ui/QRScanner';
import { useAppSession } from '../../contexts/AppSessionContext';
import { confirmarMesaPorQr, solicitarMesa } from '../../services/mesas';
import { colores } from '../../theme/colores';

export default function HomeCliente() {
  const router = useRouter();
  const { usuario } = useAppSession();
  const primerNombre = usuario?.nombres.trim().split(/\s+/)[0] || 'Cliente';
  const [scannerVisible, setScannerVisible] = useState(false);
  const [solicitandoMesa, setSolicitandoMesa] = useState(false);
  const [avisoMesa, setAvisoMesa] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [altoDisponible, setAltoDisponible] = useState(0);
  const compacto = altoDisponible > 0 && altoDisponible < 620;
  const espacio = compacto ? 10 : 14;
  const tarjeta = { flexGrow: 1, flexBasis: 0, minHeight: 112, justifyContent: 'center' as const, padding: compacto ? 16 : 24 };

  async function confirmarMesa(rawQr: string) {
    if (!usuario?.id) throw new Error('Iniciá sesión con tu cuenta de cliente para confirmar la mesa.');
    const mesa = await confirmarMesaPorQr(usuario.id, rawQr);
    router.push({ pathname: '/cliente/menu', params: { mesaId: mesa.id } });
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
        <View accessibilityLabel="Encuestas próximamente disponibles" className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta}>
          <View className="flex-row items-center">
            <Ionicons name="bar-chart-outline" size={52} color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1"><Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Ver encuestas</Text></View>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Solicitar una mesa" disabled={solicitandoMesa} onPress={() => void solicitarUnaMesa()} className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta}>
          {solicitandoMesa ? <ChidoLoader mensaje="Enviando solicitud…" /> : <View className="flex-row items-center">
            <Ionicons name="people-outline" size={52} color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Solicitar mesa</Text>
              <Text className="mt-1 text-base font-bold text-chido-texto-secundario-sobre-oscuro">El metre te asignará una mesa disponible</Text>
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
