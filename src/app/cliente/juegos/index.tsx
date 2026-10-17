import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, Text, View } from 'react-native';
import { Header } from '../../../components/Header';
import { JuegoPromoCard } from '../../../components/juegos/JuegoPromoCard';
import { useAltoDisponible } from '../../../hooks/useAltoDisponible';
import { colores } from '../../../theme/colores';

export default function JuegosCliente() {
  const router = useRouter();
  const { pedidoId } = useLocalSearchParams<{ pedidoId: string }>();
  const { alMedir, compacto } = useAltoDisponible();

  return (
    <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
      <Header userName="Cliente" role="Juegos y descuentos" />
      <View className="flex-1 px-5" onLayout={alMedir} style={{ paddingVertical: compacto ? 12 : 20, gap: compacto ? 12 : 24 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4">
          <Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} />
          <Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver al pedido</Text>
        </Pressable>
        <View className={`rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera px-5 ${compacto ? 'py-2' : 'py-4'}`}>
          <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={compacto ? { fontSize: 34, lineHeight: 42 } : { fontSize: 48, lineHeight: 60 }}>Juegos</Text>
        </View>
        <JuegoPromoCard compacto={compacto} titulo="Ta-te-ti" descuento="10%" icono="grid-outline" onPress={() => router.push(`/cliente/juegos/ta-te-ti?pedidoId=${encodeURIComponent(pedidoId ?? '')}` as never)} />
        <JuegoPromoCard compacto={compacto} titulo="Memotest exprés" descuento="15%" icono="layers-outline" onPress={() => router.push(`/cliente/juegos/memotest?pedidoId=${encodeURIComponent(pedidoId ?? '')}` as never)} />
        <JuegoPromoCard compacto={compacto} titulo="Ahorcado" descuento="20%" icono="text-outline" onPress={() => router.push(`/cliente/juegos/ahorcado?pedidoId=${encodeURIComponent(pedidoId ?? '')}` as never)} />
      </View>
    </SafeAreaView>
  );
}
