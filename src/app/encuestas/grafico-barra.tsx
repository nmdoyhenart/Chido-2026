import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useNombreCliente } from '../../hooks/useNombreCliente';
import { colores } from '../../theme/colores';
import { obtenerResultadosEncuestas, resumirEncuestas, ResultadoEncuesta } from '../../../lib/encuestas';

export default function GraficoBarra() {
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

  const resumen = resumirEncuestas(resultados);
  
  const chartData = {
    labels: ['Comida', 'Atención'],
    datasets: [
      {
        data: [
          resumen.promedioComida ? Number(resumen.promedioComida.toFixed(1)) : 0, 
          resumen.promedioAtencion ? Number(resumen.promedioAtencion.toFixed(1)) : 0,
        ],
        colors: [
          (opacity = 1) => colores.bordeNaranja,
          (opacity = 1) => colores.bordeNaranja,
        ]
      }
    ]
  };

  const valComida = resumen.promedioComida > 0 ? resumen.promedioComida.toFixed(1) : '-';
  const valAtencion = resumen.promedioAtencion > 0 ? resumen.promedioAtencion.toFixed(1) : '-';

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={nombreCliente} role="Gráficos" />
      
      <View className="flex-1 p-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro mb-6">
          Calificaciones
        </Text>

        {/* Tarjetas superiores */}
        <View className="flex-row justify-between mb-4" style={{ gap: 12 }}>
          <View className="flex-1 rounded-3xl p-4 items-center border-2 border-white/70" style={{ backgroundColor: colores.cabecera }}>
            <Ionicons name="restaurant-outline" size={28} color={colores.textoSobreOscuro} />
            <Text className="text-3xl font-extrabold text-chido-texto-sobre-oscuro mt-1">{valComida}</Text>
            <Text className="text-sm font-bold text-chido-texto-secundario-sobre-oscuro">Comida /5</Text>
          </View>
          
          <View className="flex-1 rounded-3xl p-4 items-center border-2 border-white/70" style={{ backgroundColor: colores.cabecera }}>
            <Ionicons name="people-outline" size={28} color={colores.textoSobreOscuro} />
            <Text className="text-3xl font-extrabold text-chido-texto-sobre-oscuro mt-1">{valAtencion}</Text>
            <Text className="text-sm font-bold text-chido-texto-secundario-sobre-oscuro">Atención /5</Text>
          </View>
        </View>

        {/* Contenedor del gráfico */}
        <View className="flex-1 rounded-3xl justify-center items-center border-2 border-white/70 overflow-hidden" style={{ backgroundColor: colores.superficieTerracota, paddingRight: 10 }}>
          {resumen.total === 0 ? (
            <EstadoVacio mensaje="Nada para mostrar" compacto />
          ) : (
            <BarChart
              data={chartData}
              width={Dimensions.get('window').width - 32}
              height={Dimensions.get('window').height * 0.45}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero
              showValuesOnTopOfBars
              segments={5}
              withCustomBarColorFromData={true}
              flatColor={true}
              chartConfig={{
                backgroundColor: colores.superficieTerracota,
                backgroundGradientFrom: colores.superficieTerracota,
                backgroundGradientTo: colores.superficieTerracota,
                decimalPlaces: 0,
                color: (opacity = 1) => colores.superficie,
                labelColor: (opacity = 1) => colores.textoSobreOscuro,
                barPercentage: 1.3,
              }}
              style={{ borderRadius: 16 }}
            />
          )}
        </View>
      </View>
    </View>
  );
}
