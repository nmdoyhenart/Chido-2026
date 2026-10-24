import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores } from '../../theme/colores';
import { obtenerResultadosEncuestas, resumirEncuestas, ResultadoEncuesta } from '../../../lib/encuestas';
import { Header } from '../../components/Header';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

export default function EncuestasPrevias() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [resultados, setResultados] = useState<ResultadoEncuesta[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerResultadosEncuestas();
      setResultados(data);
    } catch (err) {
      console.error('Error al traer resultados de encuestas:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const inicio = setTimeout(() => { void cargar(); }, 0);
    return () => clearTimeout(inicio);
  }, [cargar]);

  const resumen = resumirEncuestas(resultados);
  const hayDatos = resumen.total > 0;
  const valorRecomendacion = (texto: string) => (hayDatos ? texto : '-');

  return (
    <View className="flex-1 bg-chido-fondo">
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName="Cliente" role="Estadísticas" />

      <View
        className="flex-1"
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
          gap: 12,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            className="flex-row items-center rounded-xl bg-chido-acento px-3 py-1.5"
          >
            <Ionicons name="arrow-back" size={20} color={colores.textoSobreOscuro} />
            <Text className="ml-1 text-sm font-bold text-chido-texto-sobre-oscuro">Volver</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold" style={{ color: colores.textoSecundarioSobreOscuro }}>
            {hayDatos ? 'Opiniones de clientes' : 'Todavía no hay encuestas'}
          </Text>
        </View>
        
        {cargando && <ActivityIndicator color={colores.textoSobreOscuro} />}

        {/* Promedios de Comida y Atención (Nuevo) */}
        <View className="flex-row" style={{ height: 130, gap: 12 }}>
          <TarjetaPromedio 
            icono="restaurant-outline" 
            valor={resumen.promedioComida} 
            etiqueta="Comida" 
          />
          <TarjetaPromedio 
            icono="people-outline" 
            valor={resumen.promedioAtencion} 
            etiqueta="Atención" 
          />
        </View>

        {/* Recomiendan / no recomiendan */}
        <View className="flex-row" style={{ height: 130, gap: 12 }}>
          <TarjetaRecomendacion 
            icono="thumbs-up-outline" 
            valor={valorRecomendacion(String(resumen.recomiendan))} 
            etiqueta="Recomienda" 
          />
          <TarjetaRecomendacion 
            icono="thumbs-down-outline" 
            valor={valorRecomendacion(String(resumen.noRecomiendan))} 
            etiqueta="No recomienda" 
          />
        </View>

        {/* Gráficos */}
        <View className="flex-1" style={{ gap: 12, marginTop: 4 }}>
          <FilaGrafico 
            icono="pie-chart-outline" 
            titulo="Recomendación" 
            subtitulo="Ver gráfico de clientes" 
            onPress={() => router.push('/encuestas/grafico-torta')}
          />
          <FilaGrafico 
            icono="bar-chart-outline" 
            titulo="Comida y atención" 
            subtitulo="Comparar promedios" 
            onPress={() => router.push('/encuestas/grafico-barra')}
          />
          <FilaGrafico 
            icono="trending-up-outline" 
            titulo="Encuestas por día" 
            subtitulo="Evolución de respuestas" 
            onPress={() => router.push('/encuestas/grafico-lineal')}
          />
        </View>
      </View>
    </View>
  );
}

function TarjetaPromedio({ valor, etiqueta, icono }: { valor: number; etiqueta: string; icono: NombreIcono }) {
  const valorStr = valor > 0 ? `${valor.toFixed(1)}/5` : '-/5';
  return (
    <View
      className="flex-1 rounded-3xl p-5 justify-center items-center border-2 border-white/70"
      style={{ backgroundColor: colores.cabecera }}
    >
      <View className="flex-row items-center justify-center gap-2">
        <Ionicons name={icono} size={32} color={colores.textoSobreOscuro} />
        <Text className="text-3xl font-bold" style={{ color: colores.textoSobreOscuro }}>
          {valorStr}
        </Text>
      </View>
      <Text className="text-sm font-bold mt-2" style={{ color: colores.textoSecundarioSobreOscuro }}>
        {etiqueta}
      </Text>
    </View>
  );
}

function TarjetaRecomendacion({ valor, etiqueta, icono }: { valor: string; etiqueta: string; icono: NombreIcono }) {
  return (
    <View
      className="flex-1 rounded-3xl p-5 justify-center items-center border-2 border-white/70"
      style={{ backgroundColor: colores.superficieTerracota }}
    >
      <View className="flex-row items-center justify-center gap-2">
        <Ionicons name={icono} size={32} color={colores.textoSobreOscuro} />
        <Text className="text-3xl font-bold" style={{ color: colores.textoSobreOscuro }}>
          {valor}
        </Text>
      </View>
      <Text className="text-sm font-bold mt-2" style={{ color: colores.textoSecundarioSobreOscuro }}>
        {etiqueta}
      </Text>
    </View>
  );
}

function FilaGrafico({ icono, titulo, subtitulo, onPress }: { icono: NombreIcono; titulo: string; subtitulo: string, onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 flex-row items-center rounded-3xl px-4 border-2 border-white/70"
      style={{ backgroundColor: colores.cabecera }}
    >
      <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: colores.botonPrincipal }}>
        <Ionicons name={icono} size={30} color={colores.textoSobreOscuro} />
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-2xl font-bold" style={{ color: colores.textoSobreOscuro }} numberOfLines={1}>
          {titulo}
        </Text>
        <Text className="text-base" style={{ color: colores.textoSecundarioSobreOscuro }} numberOfLines={1}>
          {subtitulo}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
    </TouchableOpacity>
  );
}
