import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Header } from '../../../components/Header';
import { JuegoPromoCard } from '../../../components/juegos/JuegoPromoCard';
import { colores } from '../../../theme/colores';

export default function JuegosCliente() {
  const router = useRouter();
  const { pedidoId } = useLocalSearchParams<{ pedidoId: string }>();

  return (
    <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
      <Header userName="Cliente" role="Juegos y descuentos" />
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 20, gap: 24 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4">
          <Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} />
          <Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver al pedido</Text>
        </Pressable>
        <View className="rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera px-5 py-4">
          <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 48, lineHeight: 60 }}>Juegos</Text>
        </View>
        <JuegoPromoCard titulo="Ta-te-ti" descuento="10%" icono="grid-outline" onPress={() => router.push(`/cliente/juegos/ta-te-ti?pedidoId=${encodeURIComponent(pedidoId ?? '')}` as never)} />
        <JuegoPromoCard titulo="Memotest exprés" descuento="15%" icono="layers-outline" onPress={() => router.push(`/cliente/juegos/memotest?pedidoId=${encodeURIComponent(pedidoId ?? '')}` as never)} />
        <JuegoPromoCard titulo="Ahorcado" descuento="20%" icono="text-outline" onPress={() => router.push(`/cliente/juegos/ahorcado?pedidoId=${encodeURIComponent(pedidoId ?? '')}` as never)} />
      </ScrollView>
    </SafeAreaView>
  );
}
