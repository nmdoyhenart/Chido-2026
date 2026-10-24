import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, useWindowDimensions, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { Header } from '../../../components/Header';
import { useNombreCliente } from '../../../hooks/useNombreCliente';
import ChidoLoader from '../../../components/ui/ChidoLoader';
import ChidoLoaderOverlay from '../../../components/ui/ChidoLoaderOverlay';
import { useAltoDisponible } from '../../../hooks/useAltoDisponible';
import { iniciarAhorcado, intentarLetraAhorcado } from '../../../services/juegos';
import { colores } from '../../../theme/colores';
import type { EstadoAhorcado, PalabraAhorcado } from '../../../types/juegos';
import { crearPartidaAhorcado, ganoAhorcado, LETRAS_AHORCADO, normalizarLetraAhorcado, revelarPalabraAhorcado } from '../../../utils/ahorcado';

function FiguraAhorcado({ errores, alto = 142 }: { errores: number; alto?: number }) {
  const color = colores.textoSobreOscuro;
  return (
    <View accessibilityLabel={`${errores} de 6 errores`} className="items-center">
      <Svg width={Math.round((alto * 180) / 142)} height={alto} viewBox="0 0 180 142">
        <Line x1="18" y1="132" x2="146" y2="132" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <Line x1="42" y1="132" x2="42" y2="14" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <Line x1="42" y1="14" x2="132" y2="14" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <Line x1="132" y1="14" x2="132" y2="34" stroke={color} strokeWidth="6" strokeLinecap="round" />
        {errores >= 1 && <Circle cx="132" cy="48" r="14" stroke={color} strokeWidth="5" fill="none" />}
        {errores >= 2 && <Line x1="132" y1="62" x2="132" y2="92" stroke={color} strokeWidth="5" strokeLinecap="round" />}
        {errores >= 3 && <Line x1="132" y1="70" x2="112" y2="84" stroke={color} strokeWidth="5" strokeLinecap="round" />}
        {errores >= 4 && <Line x1="132" y1="70" x2="152" y2="84" stroke={color} strokeWidth="5" strokeLinecap="round" />}
        {errores >= 5 && <Line x1="132" y1="92" x2="116" y2="116" stroke={color} strokeWidth="5" strokeLinecap="round" />}
        {errores >= 6 && <Line x1="132" y1="92" x2="148" y2="116" stroke={color} strokeWidth="5" strokeLinecap="round" />}
      </Svg>
      <Text className="text-base font-bold text-chido-texto-sobre-oscuro">Errores {errores} de 6</Text>
    </View>
  );
}

export default function Ahorcado() {
  const router = useRouter();
  const { pedidoId, recreativo: recreativoParam, clienteAnonimoId } = useLocalSearchParams<{ pedidoId: string; recreativo?: string; clienteAnonimoId?: string }>();
  const recreativoInicial = recreativoParam === 'true';
  const { nombreCliente } = useNombreCliente(clienteAnonimoId);
  const { width } = useWindowDimensions();
  const { alMedir, compacto } = useAltoDisponible();
  const [altoJuego, setAltoJuego] = useState(0);
  const [juego, setJuego] = useState<EstadoAhorcado | null>(null);
  const [cargando, setCargando] = useState(() => Boolean(pedidoId) && !recreativoInicial);
  const [bloqueado, setBloqueado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recreativo, setRecreativo] = useState(recreativoInicial);
  const [partidaRec, setPartidaRec] = useState<PalabraAhorcado | null>(() => recreativoInicial ? crearPartidaAhorcado() : null);
  const [letrasRec, setLetrasRec] = useState<string[]>([]);
  const [erroresRec, setErroresRec] = useState(0);

  useEffect(() => {
    if (!pedidoId || recreativoInicial) return;
    void iniciarAhorcado(pedidoId)
      .then(setJuego)
      .catch((error: unknown) => {
        setAviso(error instanceof Error ? error.message : 'No se pudo preparar Ahorcado.');
        Vibration.vibrate(180);
      })
      .finally(() => setCargando(false));
  }, [pedidoId, recreativoInicial]);

  const palabra = recreativo && partidaRec ? revelarPalabraAhorcado(partidaRec.palabra, letrasRec) : juego?.palabra ?? [];
  const letrasIntentadas = recreativo ? letrasRec : juego?.letras_intentadas ?? [];
  const errores = recreativo ? erroresRec : juego?.errores ?? 0;
  const categoria = recreativo ? partidaRec?.categoria ?? '' : juego?.categoria ?? '';
  const terminado = recreativo && partidaRec
    ? ganoAhorcado(partidaRec.palabra, letrasRec) || erroresRec >= 6
    : juego ? juego.estado !== 'en_curso' : false;
  const gano = recreativo && partidaRec ? ganoAhorcado(partidaRec.palabra, letrasRec) : juego?.estado === 'ganado';
  const mensajeError = aviso ?? (!pedidoId && !recreativo ? 'No encontramos el pedido para iniciar Ahorcado.' : null);
  const anchoTecla = Math.floor((width - 40 - 48) / 7);
  const altoTecla = compacto ? Math.max(32, Math.min(40, anchoTecla)) : Math.max(36, Math.min(48, anchoTecla));
  // El dibujo usa lo que queda del área de juego después de la palabra (48), el teclado (4 filas) y los márgenes.
  const altoFigura = altoJuego > 0 ? Math.max(56, Math.min(142, altoJuego - 48 - (altoTecla * 4 + 24) - 24 - 24 - 16)) : 142;

  function iniciarRecreativo() {
    setRecreativo(true);
    setPartidaRec(crearPartidaAhorcado());
    setLetrasRec([]);
    setErroresRec(0);
    setAviso(null);
  }

  async function elegirLetra(valor: string) {
    const letra = normalizarLetraAhorcado(valor);
    if (!letra || bloqueado || terminado || letrasIntentadas.includes(letra)) return;

    if (recreativo && partidaRec) {
      const siguientes = [...letrasRec, letra];
      setLetrasRec(siguientes);
      if (!partidaRec.palabra.includes(letra)) setErroresRec((actual) => actual + 1);
      return;
    }

    if (!pedidoId) return;
    setBloqueado(true);
    try {
      setJuego(await intentarLetraAhorcado(pedidoId, letra));
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo registrar la letra.');
      Vibration.vibrate(180);
    } finally {
      setBloqueado(false);
    }
  }

  if (cargando) return <View className="flex-1 justify-center bg-chido-fondo"><ChidoLoader mensaje="Preparando Ahorcado…" /></View>;

  const mascota = gano ? require('../../../../assets/images/mascota-contenta-descuento.png') : require('../../../../assets/images/mascota-trsite-descuento.png');
  if (terminado) {
    const palabraFinal = recreativo
      ? partidaRec?.palabra ?? ''
      : juego?.palabra_resuelta || juego?.palabra.map((letra) => letra ?? '').join('') || 'No pudimos recuperar la palabra.';
    return (
      <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
        <Header userName={nombreCliente} role="Ahorcado" />
        <View className="flex-1" onLayout={alMedir} style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4"><Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} /><Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text></Pressable>
          {/* La mascota usa solo el espacio libre; la tarjeta de resultado y el botón siempre quedan visibles. */}
          <View className="flex-1 items-center justify-center py-2" style={{ minHeight: 0 }}>
            <Image source={mascota} resizeMode="contain" style={{ width: '100%', height: '100%', maxWidth: 280, maxHeight: 280 }} />
          </View>
          <View className={`mb-3 items-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera ${compacto ? 'p-4' : 'p-6'}`}>
            <Ionicons name={gano ? 'trophy-outline' : 'game-controller-outline'} size={compacto ? 44 : 64} color={colores.textoSobreOscuro} />
            <Text className={`${compacto ? 'mt-2 text-3xl' : 'mt-4 text-4xl'} text-center font-extrabold text-chido-texto-sobre-oscuro`}>Resultado de Ahorcado</Text>
            <Text className={`${compacto ? 'mt-2 text-xl' : 'mt-3 text-2xl'} text-center font-bold text-chido-texto-secundario-sobre-oscuro`}>{gano ? recreativo ? 'Ganaste la partida recreativa.' : juego?.descuento_otorgado === 20 ? 'Aplicamos 20% de descuento a tu cuenta.' : 'Ganaste, pero tu cuenta ya tenía un descuento aplicado.' : recreativo ? 'Terminaste la partida recreativa.' : 'Se agotaron los seis errores.'}</Text>
            <Text className={`${compacto ? 'mt-2' : 'mt-4'} text-xl font-extrabold text-chido-texto-sobre-oscuro`}>Palabra: {palabraFinal}</Text>
          </View>
          <Pressable onPress={iniciarRecreativo} accessibilityRole="button" className="min-h-16 flex-row items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-botonPrincipal px-5 py-4"><Ionicons name="refresh-outline" size={28} color={colores.textoSobreOscuro} /><Text className="ml-3 text-xl font-extrabold text-chido-texto-sobre-oscuro">Nueva partida recreativa</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
      <Header userName={nombreCliente} role="Ahorcado" />
      <View className="relative flex-1" onLayout={alMedir} style={{ paddingHorizontal: 20, paddingTop: compacto ? 12 : 16, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4"><Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} /><Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text></Pressable>
          <View className={`rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera ${compacto ? 'mt-3 px-4 py-2' : 'mt-4 p-4'}`}><Text className={`${compacto ? 'text-3xl' : 'text-5xl'} font-extrabold text-chido-texto-sobre-oscuro`}>Ahorcado</Text><Text className={`${compacto ? 'mt-1 text-lg' : 'mt-2 text-2xl'} text-chido-texto-secundario-sobre-oscuro`}>Categoría: {categoria || 'Restaurante mexicano'}{recreativo ? ' · Partida recreativa sin descuento' : ''}</Text></View>
        {mensajeError && <View className="mt-3 rounded-2xl bg-chido-error p-3"><Text className="text-center font-bold text-chido-texto-sobre-oscuro">{mensajeError}</Text></View>}
        <View className="flex-1 justify-between py-3" onLayout={({ nativeEvent }) => setAltoJuego(Math.round(nativeEvent.layout.height))}>
          <FiguraAhorcado errores={errores} alto={altoFigura} />
          <View className="flex-row flex-wrap justify-center" style={{ gap: 10 }}>{palabra.map((letra, indice) => <View key={indice} className="h-12 min-w-9 items-center justify-end border-b-4 border-chido-texto-sobre-oscuro"><Text className="text-3xl font-extrabold text-chido-texto-sobre-oscuro">{letra ?? ''}</Text></View>)}</View>
          <View className="flex-row flex-wrap justify-center" style={{ columnGap: 8, rowGap: 8 }}>{LETRAS_AHORCADO.map((letra) => <Pressable key={letra} onPress={() => void elegirLetra(letra)} disabled={bloqueado || letrasIntentadas.includes(letra)} accessibilityRole="button" accessibilityLabel={`Letra ${letra}`} style={{ width: anchoTecla, height: altoTecla }} className={`items-center justify-center rounded-xl border-2 border-chido-texto-secundario-alternativo ${letrasIntentadas.includes(letra) ? 'bg-chido-cabecera opacity-50' : 'bg-chido-acento'}`}><Text className="text-xl font-extrabold text-chido-texto-sobre-oscuro">{letra}</Text></Pressable>)}</View>
        </View>
        {bloqueado && <ChidoLoaderOverlay mensaje="Registrando la letra…" />}
      </View>
    </SafeAreaView>
  );
}
