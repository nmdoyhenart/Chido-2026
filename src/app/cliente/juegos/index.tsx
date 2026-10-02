import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Header } from '../../../components/Header';
import { colores } from '../../../theme/colores';

export default function JuegosCliente() {
  const router = useRouter();
  const { pedidoId } = useLocalSearchParams<{ pedidoId: string }>();

  return (
    <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
      <Header userName="Cliente" role="Juegos y descuentos" />
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 20, gap: 16 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4">
          <Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} />
          <Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver al pedido</Text>
        </Pressable>
        <View className="rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-5">
          <Text className="text-3xl font-extrabold text-chido-texto-sobre-oscuro">Juegos</Text>
          <Text className="mt-2 text-lg text-chido-texto-secundario-sobre-oscuro">Ganando en tu primer intento podés obtener un descuento para esta cuenta.</Text>
        </View>
        <Pressable onPress={() => router.push(`/cliente/juegos/ta-te-ti?pedidoId=${encodeURIComponent(pedidoId ?? '')}` as never)} accessibilityRole="button" className="min-h-40 rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-5">
          <View className="flex-row items-center justify-between">
            <Ionicons name="grid-outline" size={48} color={colores.textoSobreOscuro} />
            <View className="rounded-full bg-chido-acento px-4 py-2"><Text className="text-base font-extrabold text-chido-texto-sobre-oscuro">10% de descuento</Text></View>
          </View>
          <Text className="mt-4 text-2xl font-extrabold text-chido-texto-sobre-oscuro">Ta-te-ti</Text>
          <Text className="mt-1 text-base text-chido-texto-secundario-sobre-oscuro">Vencenos formando una línea de tres X.</Text>
        </Pressable>
        <View className="rounded-3xl border-2 border-chido-borde-naranja bg-chido-acento p-5 opacity-80">
          <Text className="text-xl font-extrabold text-chido-texto-sobre-oscuro">Memotest exprés</Text>
          <Text className="mt-1 text-base text-chido-texto-secundario-sobre-oscuro">Próximamente: 15% de descuento.</Text>
        </View>
        <View className="rounded-3xl border-2 border-chido-borde-naranja bg-chido-acento p-5 opacity-80">
          <Text className="text-xl font-extrabold text-chido-texto-sobre-oscuro">Ahorcado</Text>
          <Text className="mt-1 text-base text-chido-texto-secundario-sobre-oscuro">Próximamente: 20% de descuento.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
