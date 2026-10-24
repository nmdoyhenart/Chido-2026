import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { useNombreCliente } from '../../hooks/useNombreCliente';
import { colores } from '../../theme/colores';
import { obtenerResultadosEncuestas, ResultadoEncuesta } from '../../../lib/encuestas';

export default function GraficoLineal() {
  const insets = useSafeAreaInsets();
  const { nombreCliente } = useNombreCliente();
  const [resultados, setResultados] = useState<ResultadoEncuesta[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const data = await obtenerResultadosEncuestas();
      setResultados(data);
      setCargando(false);
    }
    cargar();
  }, []);

  if (cargando) {
    return (
      <View className="flex-1 bg-chido-fondo justify-center items-center">
        <ActivityIndicator size="large" color={colores.textoSobreOscuro} />
      </View>
    );
  }

  // Agrupar encuestas por día
  const agrupadoPorDia: Record<string, number> = {};
  
  resultados.forEach(res => {
    const dia = new Date(res.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    agrupadoPorDia[dia] = (agrupadoPorDia[dia] || 0) + 1;
  });

  const etiquetas = Object.keys(agrupadoPorDia).sort();
  const valores = etiquetas.map(d => agrupadoPorDia[d]);

  const maxVal = valores.length > 0 ? Math.max(...valores) : 0;
  const total = resultados.length;
  const dias = etiquetas.length;

  const chartData = {
    labels: etiquetas.length > 0 ? etiquetas : ['-'],
    datasets: [
      {
        data: valores.length > 0 ? valores : [0]
      }
    ]
  };

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={nombreCliente} role="Gráficos" />
      
      <View className="flex-1 p-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro mb-6">
          Evolución
        </Text>

        {/* Tarjetas superiores pequeñas */}
        <View className="flex-row justify-between mb-4" style={{ gap: 8 }}>
          <View className="flex-1 rounded-3xl p-3 items-center border-2 border-white/70" style={{ backgroundColor: colores.cabecera }}>
            <Ionicons name="document-text-outline" size={24} color={colores.textoSobreOscuro} />
            <Text className="text-2xl font-extrabold text-chido-texto-sobre-oscuro mt-1">{total}</Text>
            <Text className="text-xs font-bold text-chido-texto-secundario-sobre-oscuro">Total</Text>
          </View>
          
          <View className="flex-1 rounded-3xl p-3 items-center border-2 border-white/70" style={{ backgroundColor: colores.cabecera }}>
            <Ionicons name="calendar-outline" size={24} color={colores.textoSobreOscuro} />
            <Text className="text-2xl font-extrabold text-chido-texto-sobre-oscuro mt-1">{dias}</Text>
            <Text className="text-xs font-bold text-chido-texto-secundario-sobre-oscuro">Días</Text>
          </View>

          <View className="flex-1 rounded-3xl p-3 items-center border-2 border-white/70" style={{ backgroundColor: colores.cabecera }}>
            <Ionicons name="flash-outline" size={24} color={colores.textoSobreOscuro} />
            <Text className="text-2xl font-extrabold text-chido-texto-sobre-oscuro mt-1">{maxVal}</Text>
            <Text className="text-xs font-bold text-chido-texto-secundario-sobre-oscuro">Máx.</Text>
          </View>
        </View>

        {/* Contenedor del gráfico */}
        <View className="flex-1 rounded-3xl justify-center items-center border-2 border-white/70 overflow-hidden" style={{ backgroundColor: colores.superficieTerracota }}>
          {resultados.length === 0 ? (
            <Text className="text-xl text-chido-texto-secundario-sobre-oscuro">No hay datos.</Text>
          ) : (
            <LineChart
              data={chartData}
              width={Dimensions.get('window').width - 32}
              height={Dimensions.get('window').height * 0.45}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero
              withOuterLines={false}
              chartConfig={{
                backgroundColor: colores.superficieTerracota,
                backgroundGradientFrom: colores.superficieTerracota,
                backgroundGradientTo: colores.superficieTerracota,
                decimalPlaces: 0,
                color: (opacity = 1) => colores.bordeNaranja,
                labelColor: (opacity = 1) => colores.textoSobreOscuro,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: colores.fondo, 
                  fill: colores.textoSobreOscuro
                },
                fillShadowGradientFrom: colores.textoSecundarioAlternativo,
                fillShadowGradientTo: colores.textoSecundarioAlternativo
              }}
              bezier
              style={{ borderRadius: 16, paddingRight: 40 }}
            />
          )}
        </View>
      </View>
    </View>
  );
}
