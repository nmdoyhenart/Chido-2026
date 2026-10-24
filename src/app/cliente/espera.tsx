import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { useAppSession } from '../../contexts/AppSessionContext';
import { obtenerEstadoListaEsperaCliente, type EstadoListaEsperaCliente } from '../../services/mesas';
import { colores } from '../../theme/colores';
import { useVibrarError } from '../../hooks/useVibrarError';
import { useNombreCliente } from '../../hooks/useNombreCliente';

export default function EsperaClienteRegistrado() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { usuario } = useAppSession();
  const { nombreCliente } = useNombreCliente();
  const [estado, setEstado] = useState<EstadoListaEsperaCliente | null>(null);
  const [error, setError] = useState('');
  useVibrarError(error);

  useEffect(() => {
    let activo = true;
    const consultar = async () => {
      try {
        const actual = await obtenerEstadoListaEsperaCliente();
        if (activo) { setEstado(actual); setError(''); }
      } catch (caught) {
        if (activo) setError(caught instanceof Error ? caught.message : 'No se pudo consultar tu estado.');
      }
    };
    void consultar();
    const intervalo = setInterval(() => { void consultar(); }, 5000);
    return () => { activo = false; clearInterval(intervalo); };
  }, []);

  const mesaAsignada = estado?.estado === 'asignado';

  return <View className="flex-1 bg-chido-fondo">
    <Stack.Screen options={{ headerShown: false }} />
    <Header userName={nombreCliente} role="Lista de espera" />
    <View
      className="flex-1"
      style={{ justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16, paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <View className="items-center">
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-chido-cabecera">
        <Ionicons name={mesaAsignada ? 'restaurant-outline' : 'time-outline'} size={42} color={colores.textoSobreOscuro} />
      </View>
      {error ? <Text className="mb-5 text-center text-lg font-semibold text-chido-texto-sobre-oscuro">{error}</Text> : null}
      {!estado && !error ? <ActivityIndicator size="large" color={colores.textoSobreOscuro} /> : null}
      {estado?.estado === 'esperando' ? <>
        <Text className="text-center text-3xl font-extrabold text-chido-texto-sobre-oscuro">Estás en la lista</Text>
        <Text className="mt-3 text-center text-lg text-chido-texto-secundario-sobre-oscuro">El metre te asignará una mesa. Esta pantalla se actualizará cuando lo haga.</Text>
      </> : null}
      {mesaAsignada ? <>
        <Text className="text-center text-3xl font-extrabold text-chido-texto-sobre-oscuro">Te asignaron la mesa {estado?.mesa_numero}</Text>
        <Text className="mt-3 text-center text-lg text-chido-texto-secundario-sobre-oscuro">Volvé al inicio y escaneá el QR de esa mesa para abrir la carta.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/cliente/home')} className="mt-7 w-full rounded-2xl border-2 border-white/70 bg-chido-cabecera p-4">
          <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Ir a escanear mi mesa</Text>
        </Pressable>
      </> : null}
      {estado?.estado === 'sin_registro' ? <>
        <Text className="text-center text-2xl font-extrabold text-chido-texto-sobre-oscuro">No estás en la lista de espera</Text>
        <Text className="mt-3 text-center text-base text-chido-texto-secundario-sobre-oscuro">Volvé al inicio y escaneá el QR de ingreso para anotarte.</Text>
      </> : null}
      <Pressable accessibilityRole="button" onPress={() => router.replace('/cliente/home')} className="mt-5 rounded-2xl border border-white/60 px-6 py-3">
        <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Volver al inicio</Text>
      </Pressable>
      </View>
    </View>
  </View>;
}
