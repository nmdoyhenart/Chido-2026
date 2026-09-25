import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, Image, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { colores } from '../../theme/colores';
import { obtenerListaEspera, suscribirseALista, ClienteEnEspera } from '../../../lib/listaEspera';
import { useAppSession } from '../../contexts/AppSessionContext';

export default function ListaEsperaMetre() {
  const router = useRouter();
  const { usuario } = useAppSession();
  const nombre = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || 'Metre';
  const [lista, setLista] = useState<ClienteEnEspera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarLista() {
      setError('');
      try {
        const data = await obtenerListaEspera();
        setLista(data);
      } catch (err) {
        console.error('Error al traer la lista de espera:', err);
        setError('No se pudo cargar la lista de espera.');
      } finally {
        setCargando(false);
      }
    }
    void cargarLista();
    return suscribirseALista('metre-lista-espera-pantalla', cargarLista);
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName={nombre} role="Metre" />

      <View className="flex-1 px-5 pt-5">
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio del metre"
          onPress={() => router.dismissTo('/metre/home')} className="self-start rounded-xl p-3 mb-3" style={{ backgroundColor: colores.cabecera }}>
          <Ionicons name="arrow-back" size={24} color={colores.textoSobreOscuro} />
        </TouchableOpacity>
        <Text className="text-3xl font-bold mb-5" style={{ color: colores.textoSobreOscuro }}>
          Lista de espera
        </Text>

        {cargando && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colores.textoSobreOscuro} />
          </View>
        )}

        {!cargando && error !== '' && (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-lg text-center" style={{ color: colores.error }}>
              {error}
            </Text>
          </View>
        )}

        {!cargando && error === '' && lista.length === 0 && (
          <View className="flex-1 items-center justify-center">
            <Text className="text-lg text-center" style={{ color: colores.textoSecundarioAlternativo }}>
              No hay clientes esperando en este momento.
            </Text>
          </View>
        )}

        {!cargando && error === '' && lista.length > 0 && (
          <FlatList
            data={lista}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View
                className="flex-row items-center rounded-2xl p-4 mb-4"
                style={{ backgroundColor: colores.superficieTerracota }}
              >
                <Image
                  source={{ uri: item.foto_url }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
                <View className="flex-1 ml-4">
                  <Text className="text-xl font-semibold" style={{ color: colores.textoSobreOscuro }}>
                    {item.nombre}
                  </Text>
                  <Text className="text-sm" style={{ color: colores.textoSecundarioSobreOscuro }}>
                    {item.tipo_cliente === 'anonimo' ? 'Cliente anónimo' : 'Cliente registrado'}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}
