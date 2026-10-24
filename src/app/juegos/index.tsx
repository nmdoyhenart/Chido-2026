import { Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { useNombreCliente } from '../../hooks/useNombreCliente';

export default function Juegos() {
  const router = useRouter();
  const { nombreCliente } = useNombreCliente();

  return (
    <View className="flex-1 bg-chido-fondo">
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName={nombreCliente} role="Juegos" />
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-lg text-chido-texto-sobre-oscuro">
          Sección de juegos de prueba.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
          className="mt-6 rounded-2xl border-2 border-white/70 bg-chido-botonPrincipal px-6 py-4"
        >
          <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Volver al pedido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
