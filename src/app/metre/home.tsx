import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { obtenerListaEspera, suscribirseALista } from '../../../lib/listaEspera';
import { useAppSession } from '../../contexts/AppSessionContext';

export default function HomeMetre() {
  const router = useRouter();
  const { usuario } = useAppSession();
  const nombre = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || 'Metre';
  const [cantidadEsperando, setCantidadEsperando] = useState(0);

  useEffect(() => {
    async function cargarCantidad() {
      try {
        const data = await obtenerListaEspera();
        setCantidadEsperando(data.length);
      } catch (err) {
        console.error('Error al traer la cantidad de espera:', err);
      }
    }
    void cargarCantidad();
    return suscribirseALista('home-metre-lista-espera', cargarCantidad);
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName={nombre} role="Metre" />

      <View className="flex-1 px-5 pt-5 pb-6">
        <Text
          className="text-4xl font-bold mb-5"
          style={{ color: colores.textoSobreOscuro }}
        >
          {usuario?.nombres ? `Hola, ${usuario.nombres.trim().split(/\s+/)[0]}` : 'Hola, Metre'}
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.push('/(auth)/registro')}
          className="rounded-2xl px-4 py-3 mb-5 flex-row items-center justify-center"
          style={{ backgroundColor: colores.botonPrincipal, borderWidth: 1, borderColor: colores.textoSecundarioAlternativo, minHeight: 48 }}
        >
          <Ionicons name="person-add-outline" size={24} color={colores.textoSobreOscuro} />
          <Text className="text-lg font-bold ml-3" style={{ color: colores.textoSobreOscuro }}>Registrar cliente</Text>
        </TouchableOpacity>

        {/* Mesas ocupadas — número fijo por ahora, se conecta en el paso 4 */}
        <View
          className="rounded-3xl p-6 mb-5 justify-center"
          style={{ backgroundColor: colores.superficieTerracota, flex: 1 }}
        >
          <View className="flex-row justify-between mb-4">
            <Text className="text-2xl font-semibold" style={{ color: colores.textoSecundarioSobreOscuro }}>
              Mesas ocupadas
            </Text>
            <Text className="text-2xl font-bold" style={{ color: colores.textoSobreOscuro }}>
              8/12
            </Text>
          </View>
          <View className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: colores.botonPrincipal }}>
            <View className="h-4 rounded-full" style={{ width: '66%', backgroundColor: colores.textoSecundarioAlternativo }} />
          </View>
        </View>

        {/* Lista de espera — conectada a Realtime, navega a lista-espera.tsx */}
        <TouchableOpacity
          className="rounded-3xl p-6 mb-5 flex-row items-center"
          style={{ backgroundColor: colores.superficieTerracota, flex: 1.4 }}
          onPress={() => router.push('/metre/listaEspera')}
        >
          <View
            className="rounded-full items-center justify-center mr-4"
            style={{ width: 64, height: 64, backgroundColor: colores.botonPrincipal }}
          >
            <Ionicons name="time-outline" size={36} color={colores.textoSobreOscuro} />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-semibold" style={{ color: colores.textoSobreOscuro }}>
              Lista de espera
            </Text>
            <Text className="text-base mt-1" style={{ color: colores.textoSecundarioSobreOscuro }}>
              Clientes esperando una mesa disponible
            </Text>
          </View>
          <View
            className="rounded-full items-center justify-center"
            style={{ width: 40, height: 40, backgroundColor: colores.notificacion }}
          >
            <Text className="text-lg font-bold" style={{ color: colores.textoSobreOscuro }}>
              {cantidadEsperando}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Mapa del salón — sin destino todavía, se define en el paso 5 */}
        <TouchableOpacity
          className="rounded-3xl p-6 flex-row items-center"
          style={{ backgroundColor: colores.superficieTerracota, flex: 1.4 }}
        >
          <View
            className="rounded-full items-center justify-center mr-4"
            style={{ width: 64, height: 64, backgroundColor: colores.botonPrincipal }}
          >
            <Ionicons name="grid-outline" size={36} color={colores.textoSobreOscuro} />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-semibold" style={{ color: colores.textoSobreOscuro }}>
              Mapa del salón
            </Text>
            <Text className="text-base mt-1" style={{ color: colores.textoSecundarioSobreOscuro }}>
              Vistá el estado de cada mesa
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={28} color={colores.textoSecundarioAlternativo} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
