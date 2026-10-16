import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, useWindowDimensions, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { Header } from '../../../components/Header';
import ChidoLoader from '../../../components/ui/ChidoLoader';
import ChidoLoaderOverlay from '../../../components/ui/ChidoLoaderOverlay';
import { iniciarAhorcado, intentarLetraAhorcado } from '../../../services/juegos';
import { colores } from '../../../theme/colores';
import type { EstadoAhorcado, PalabraAhorcado } from '../../../types/juegos';
import { crearPartidaAhorcado, ganoAhorcado, LETRAS_AHORCADO, normalizarLetraAhorcado, revelarPalabraAhorcado } from '../../../utils/ahorcado';

function FiguraAhorcado({ errores }: { errores: number }) {
  const color = colores.textoSobreOscuro;
  return (
    <View accessibilityLabel={`${errores} de 6 errores`} className="items-center">
      <Svg width={180} height={142} viewBox="0 0 180 142">
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
  const { pedidoId } = useLocalSearchParams<{ pedidoId: string }>();
  const { height, width } = useWindowDimensions();
  const [juego, setJuego] = useState<EstadoAhorcado | null>(null);
  const [cargando, setCargando] = useState(() => Boolean(pedidoId));
  const [bloqueado, setBloqueado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recreativo, setRecreativo] = useState(false);
  const [partidaRec, setPartidaRec] = useState<PalabraAhorcado | null>(null);
  const [letrasRec, setLetrasRec] = useState<string[]>([]);
  const [erroresRec, setErroresRec] = useState(0);

  useEffect(() => {
    if (!pedidoId) return;
    void iniciarAhorcado(pedidoId)
      .then(setJuego)
      .catch((error: unknown) => {
        setAviso(error instanceof Error ? error.message : 'No se pudo preparar Ahorcado.');
        Vibration.vibrate(180);
      })
      .finally(() => setCargando(false));
  }, [pedidoId]);

  const palabra = recreativo && partidaRec ? revelarPalabraAhorcado(partidaRec.palabra, letrasRec) : juego?.palabra ?? [];
  const letrasIntentadas = recreativo ? letrasRec : juego?.letras_intentadas ?? [];
  const errores = recreativo ? erroresRec : juego?.errores ?? 0;
  const categoria = recreativo ? partidaRec?.categoria ?? '' : juego?.categoria ?? '';
  const terminado = recreativo && partidaRec
    ? ganoAhorcado(partidaRec.palabra, letrasRec) || erroresRec >= 6
    : juego ? juego.estado !== 'en_curso' : false;
  const gano = recreativo && partidaRec ? ganoAhorcado(partidaRec.palabra, letrasRec) : juego?.estado === 'ganado';
  const mensajeError = aviso ?? (!pedidoId ? 'No encontramos el pedido para iniciar Ahorcado.' : null);
  const anchoTecla = Math.floor((width - 40 - 48) / 7);
  const altoTecla = Math.max(36, Math.min(48, anchoTecla));
  const tamanioMascotaFinal = Math.min(width - 72, height < 720 ? 170 : height < 820 ? 240 : 280);

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
    const palabraFinal = recreativo ? partidaRec?.palabra ?? '' : juego?.palabra_resuelta ?? '';
    return (
      <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
        <Header userName="Cliente" role="Ahorcado" />
        <View className="flex-1 px-5 py-4">
          <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4"><Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} /><Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text></Pressable>
          <View className="flex-1 justify-center">
            <Image source={mascota} resizeMode="contain" style={{ width: tamanioMascotaFinal, height: tamanioMascotaFinal }} className="mb-3 self-center" />
            <View className="items-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-6">
              <Ionicons name={gano ? 'trophy-outline' : 'game-controller-outline'} size={64} color={colores.textoSobreOscuro} />
              <Text className="mt-4 text-center text-4xl font-extrabold text-chido-texto-sobre-oscuro">Resultado de Ahorcado</Text>
              <Text className="mt-3 text-center text-2xl font-bold text-chido-texto-secundario-sobre-oscuro">{gano ? recreativo ? 'Ganaste la partida recreativa.' : 'Aplicamos 20% de descuento a tu cuenta.' : recreativo ? 'Terminaste la partida recreativa.' : 'Se agotaron los seis errores.'}</Text>
              <Text className="mt-4 text-xl font-extrabold text-chido-texto-sobre-oscuro">Palabra: {palabraFinal}</Text>
            </View>
          </View>
          <Pressable onPress={iniciarRecreativo} accessibilityRole="button" className="min-h-16 flex-row items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-botonPrincipal px-5 py-4"><Ionicons name="refresh-outline" size={28} color={colores.textoSobreOscuro} /><Text className="ml-3 text-xl font-extrabold text-chido-texto-sobre-oscuro">Nueva partida recreativa</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
      <Header userName="Cliente" role="Ahorcado" />
      <View className="relative flex-1 px-5 py-4">
        <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4"><Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} /><Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text></Pressable>
        <View className="mt-4 rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-4"><Text className="text-5xl font-extrabold text-chido-texto-sobre-oscuro">Ahorcado</Text><Text className="mt-2 text-2xl text-chido-texto-secundario-sobre-oscuro">Categoría: {categoria || 'Restaurante mexicano'}</Text></View>
        {mensajeError && <View className="mt-3 rounded-2xl bg-chido-error p-3"><Text className="text-center font-bold text-chido-texto-sobre-oscuro">{mensajeError}</Text></View>}
        <View className="flex-1 justify-between py-3">
          <FiguraAhorcado errores={errores} />
          <View className="flex-row flex-wrap justify-center" style={{ gap: 10 }}>{palabra.map((letra, indice) => <View key={indice} className="h-12 min-w-9 items-center justify-end border-b-4 border-chido-texto-sobre-oscuro"><Text className="text-3xl font-extrabold text-chido-texto-sobre-oscuro">{letra ?? ''}</Text></View>)}</View>
          <View className="flex-row flex-wrap justify-center" style={{ columnGap: 8, rowGap: 8 }}>{LETRAS_AHORCADO.map((letra) => <Pressable key={letra} onPress={() => void elegirLetra(letra)} disabled={bloqueado || letrasIntentadas.includes(letra)} accessibilityRole="button" accessibilityLabel={`Letra ${letra}`} style={{ width: anchoTecla, height: altoTecla }} className={`items-center justify-center rounded-xl border-2 border-chido-texto-secundario-alternativo ${letrasIntentadas.includes(letra) ? 'bg-chido-cabecera opacity-50' : 'bg-chido-acento'}`}><Text className="text-xl font-extrabold text-chido-texto-sobre-oscuro">{letra}</Text></Pressable>)}</View>
        </View>
        {bloqueado && <ChidoLoaderOverlay mensaje="Registrando la letra…" />}
      </View>
    </SafeAreaView>
  );
}
