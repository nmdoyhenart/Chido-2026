import { useEffect, useState, type ComponentProps } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores } from '../../theme/colores';
import { obtenerResultadosEncuestas, resumirEncuestas, ResultadoEncuesta } from '../../../lib/encuestas';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

export default function EncuestasPrevias() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const resumen = resumirEncuestas(resultados);
  const hayDatos = resumen.total > 0;
  // Sin encuestas se muestra un guion en vez de 0 para no confundir con una calificación real
  const valor = (texto: string) => (hayDatos ? texto : '–');

  return (
    // Los paddings dejan todo entre la barra de estado y la barra de navegación de Android, sin scroll
    <View
      className="flex-1"
      style={{
        backgroundColor: colores.fondo,
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: Math.max(insets.bottom, 16) + 8,
        gap: 12,
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Encabezado */}
      <View
        className="flex-row items-center rounded-3xl p-4 border-2 border-white/70"
        style={{ backgroundColor: colores.superficieTerracota }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          className="w-14 h-14 rounded-2xl items-center justify-center"
          style={{ backgroundColor: colores.botonPrincipal }}
        >
          <Ionicons name="arrow-back" size={30} color={colores.textoSobreOscuro} />
        </TouchableOpacity>
        <View className="flex-1 ml-4">
          <Text className="text-sm font-bold tracking-widest" style={{ color: colores.textoSecundarioSobreOscuro }}>
            ENCUESTAS
          </Text>
          <Text className="text-3xl font-bold" style={{ color: colores.textoSobreOscuro }}>
            Estadísticas
          </Text>
          <Text className="text-base" style={{ color: colores.textoSecundarioSobreOscuro }}>
            {hayDatos ? 'Opiniones de nuestros clientes.' : 'Todavía no hay encuestas.'}
          </Text>
        </View>
        {cargando && <ActivityIndicator color={colores.textoSobreOscuro} />}
      </View>

      {/* Recomiendan / no recomiendan */}
      <View className="flex-row" style={{ flex: 1.6, gap: 10 }}>
        <TarjetaRecomendacion icono="thumbs-up-outline" valor={valor(String(resumen.recomiendan))} etiqueta="Sí recomiendan" />
        <TarjetaRecomendacion icono="thumbs-down-outline" valor={valor(String(resumen.noRecomiendan))} etiqueta="No recomiendan" />
      </View>

      {/* Gráficos — sin destino todavía */}
      <FilaGrafico icono="pie-chart-outline" titulo="Recomendación" subtitulo="Ver gráfico de clientes" />
      <FilaGrafico icono="bar-chart-outline" titulo="Comida y atención" subtitulo="Comparar promedios" />
      <FilaGrafico icono="trending-up-outline" titulo="Encuestas por día" subtitulo="Evolución de respuestas" />
    </View>
  );
}

function TarjetaRecomendacion({ valor, etiqueta, icono }: { valor: string; etiqueta: string; icono: NombreIcono }) {
  return (
    <View
      className="flex-1 rounded-3xl p-4 justify-center border-2 border-white/70"
      style={{ backgroundColor: colores.superficieTerracota }}
    >
      <Ionicons name={icono} size={40} color={colores.textoSobreOscuro} />
      <Text className="text-5xl font-bold mt-2" style={{ color: colores.textoSobreOscuro }}>
        {valor}
      </Text>
      <Text className="text-lg" style={{ color: colores.textoSecundarioSobreOscuro }}>
        {etiqueta}
      </Text>
    </View>
  );
}

function FilaGrafico({ icono, titulo, subtitulo }: { icono: NombreIcono; titulo: string; subtitulo: string }) {
  return (
    <TouchableOpacity
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
