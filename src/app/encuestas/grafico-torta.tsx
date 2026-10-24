import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { useNombreCliente } from '../../hooks/useNombreCliente';
import { colores } from '../../theme/colores';
import { obtenerResultadosEncuestas, resumirEncuestas, ResultadoEncuesta } from '../../../lib/encuestas';

export default function GraficoTorta() {
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
  
  const chartData = [
    {
      name: 'Sí recomienda',
      population: resumen.recomiendan,
      color: colores.bordeNaranja, 
      legendFontColor: colores.textoSobreOscuro,
      legendFontSize: 16
    },
    {
      name: 'No recomienda',
      population: resumen.noRecomiendan,
      color: colores.botonPrincipal, 
      legendFontColor: colores.textoSobreOscuro,
      legendFontSize: 16
    }
  ];

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={nombreCliente} role="Gráficos" />
      
      <View className="flex-1 p-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro mb-6">
          Recomendación
        </Text>

        {/* Tarjetas superiores */}
        <View className="flex-row justify-between mb-4" style={{ gap: 12 }}>
          <View className="flex-1 rounded-3xl p-4 items-center border-2 border-white/70" style={{ backgroundColor: colores.cabecera }}>
            <Ionicons name="thumbs-up-outline" size={28} color={colores.textoSobreOscuro} />
            <Text className="text-3xl font-extrabold text-chido-texto-sobre-oscuro mt-1">{resumen.porcentajeRecomienda}%</Text>
            <Text className="text-sm font-bold text-chido-texto-secundario-sobre-oscuro">Recomienda</Text>
          </View>
          
          <View className="flex-1 rounded-3xl p-4 items-center border-2 border-white/70" style={{ backgroundColor: colores.cabecera }}>
            <Ionicons name="thumbs-down-outline" size={28} color={colores.textoSobreOscuro} />
            <Text className="text-3xl font-extrabold text-chido-texto-sobre-oscuro mt-1">{100 - resumen.porcentajeRecomienda}%</Text>
            <Text className="text-sm font-bold text-chido-texto-secundario-sobre-oscuro">No recomienda</Text>
          </View>
        </View>

        {/* Contenedor del gráfico */}
        <View className="flex-1 rounded-3xl justify-center border-2 border-white/70 overflow-hidden" style={{ backgroundColor: colores.superficieTerracota, paddingVertical: 20 }}>
          {resumen.total === 0 ? (
            <Text className="text-xl text-chido-texto-secundario-sobre-oscuro text-center">No hay datos.</Text>
          ) : (
            <>
              <View className="items-center justify-center">
                <PieChart
                  data={chartData}
                  width={Dimensions.get('window').width - 20}
                  height={300}
                  hasLegend={false}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  center={[(Dimensions.get('window').width - 20) / 4, 0]}
                  absolute
                />
              </View>

              {/* Leyenda personalizada centrada abajo */}
              <View className="flex-row justify-center mt-2" style={{ gap: 24 }}>
                <View className="flex-row items-center">
                  {/* AQUÍ SE CAMBIA EL COLOR DEL SÍ */}
                  <View className="w-5 h-5 rounded-full mr-2" style={{ backgroundColor: colores.bordeNaranja }} />
                  <Text className="text-base font-bold" style={{ color: colores.textoSobreOscuro }}>Sí recomienda</Text>
                </View>
                <View className="flex-row items-center">
                  {/* AQUÍ SE CAMBIA EL COLOR DEL NO */}
                  <View className="w-5 h-5 rounded-full mr-2" style={{ backgroundColor: colores.botonPrincipal }} />
                  <Text className="text-base font-bold" style={{ color: colores.textoSobreOscuro }}>No recomienda</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
