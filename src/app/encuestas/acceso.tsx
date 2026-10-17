import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QRScanner } from '../../components/ui/QRScanner';
import { parseQrPayload } from '../../utils/qr';
import { colores } from '../../theme/colores';

export default function AccesoEncuestas() {
  const router = useRouter();
  const [scannerVisible, setScannerVisible] = useState(false);

  async function validarIngreso(rawQr: string) {
    const payload = parseQrPayload(rawQr);
    if (!payload || payload.tipo !== 'ingreso') {
      throw new Error('El código escaneado no corresponde al ingreso del local.');
    }
    router.replace('/encuestas/previas');
  }

  return (
    <SafeAreaView className="flex-1 bg-chido-fondo px-6" edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-1 items-center justify-center">
        <View className="mb-8 h-28 w-28 items-center justify-center rounded-3xl bg-chido-cabecera">
          <Ionicons name="bar-chart-outline" size={58} color={colores.textoSobreOscuro} />
        </View>
        <Text className="text-center text-4xl font-extrabold text-chido-texto-sobre-oscuro">Resultados de encuestas</Text>
        <Text className="mt-5 text-center text-xl font-bold text-chido-texto-secundario-sobre-oscuro">
          Escaneá el código QR de ingreso del local para ver las opiniones de nuestros clientes.
        </Text>
        <Pressable
          className="mt-10 min-h-16 w-full flex-row items-center justify-center rounded-2xl border-2 border-white/70 bg-chido-cabecera px-6"
          onPress={() => setScannerVisible(true)}
        >
          <Ionicons name="qr-code-outline" size={30} color={colores.textoSobreOscuro} />
          <Text className="ml-3 text-xl font-extrabold text-chido-texto-sobre-oscuro">Escanear código QR</Text>
        </Pressable>
        <Pressable className="mt-4 min-h-14 px-6 justify-center" onPress={() => router.back()}>
          <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Volver</Text>
        </Pressable>
      </View>
      <QRScanner visible={scannerVisible} proposito="ingreso" onScan={validarIngreso} onClose={() => setScannerVisible(false)} />
    </SafeAreaView>
  );
}
