import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { obtenerResultadosEncuestas, ResultadoEncuesta } from '../../../lib/encuestas';

export default function EncuestasPrevias() {
  const router = useRouter();
  const [resultados, setResultados] = useState<ResultadoEncuesta[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    try {
      const data = await obtenerResultadosEncuestas();
      setResultados(data);
    } catch (err) {
      console.error('Error al traer resultados de encuestas:', err);
    } finally {
      setCargando(false);
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-5 pt-14 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={28} color={colores.textoSobreOscuro} />
        </TouchableOpacity>
        <Text className="text-3xl font-bold" style={{ color: colores.textoSobreOscuro }}>
          Encuestas anteriores
        </Text>
      </View>

      <View className="flex-1 px-5">
        {!cargando && resultados.length === 0 && (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="stats-chart-outline" size={48} color={colores.textoSecundarioAlternativo} />
            <Text className="text-lg text-center mt-4" style={{ color: colores.textoSecundarioAlternativo }}>
              Todavía no hay encuestas para mostrar.
            </Text>
          </View>
        )}

        {resultados.length > 0 && (
          <FlatList
            data={resultados}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colores.superficieTerracota }}>
                <Text style={{ color: colores.textoSobreOscuro }}>{item.fecha}</Text>
                <Text style={{ color: colores.textoSobreOscuro }}>Promedio: {item.promedio}</Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}