import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, useWindowDimensions, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import ChidoLoader from '../../../components/ui/ChidoLoader';
import { useAltoDisponible } from '../../../hooks/useAltoDisponible';
import { iniciarMemotest, voltearMemotest } from '../../../services/juegos';
import { colores } from '../../../theme/colores';
import type { CartaMemotest, EstadoMemotest } from '../../../types/juegos';
import { crearMazoMemotest, sonPareja } from '../../../utils/memotest';

const imagenes: Record<CartaMemotest, number> = {
  taco: require('../../../../assets/images/mascota-1.png'),
  chile: require('../../../../assets/images/mascota-2.png'),
  sombrero: require('../../../../assets/images/mascota-3.png'),
  cupon: require('../../../../assets/images/mascota-4.png'),
};

function obtenerImagenCarta(carta: CartaMemotest | null) {
  return carta && carta in imagenes ? imagenes[carta] : null;
}

export default function Memotest() {
  const router = useRouter();
  const { pedidoId } = useLocalSearchParams<{ pedidoId: string }>();
  const { width } = useWindowDimensions();
  const { alMedir, compacto } = useAltoDisponible();
  const [juego, setJuego] = useState<EstadoMemotest | null>(null);
  const [cargandoPedido, setCargandoPedido] = useState(() => Boolean(pedidoId));
  const [imagenesListas, setImagenesListas] = useState(false);
  const [altoGrilla, setAltoGrilla] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recreativo, setRecreativo] = useState(false);
  const [mazoRec, setMazoRec] = useState<CartaMemotest[]>([]);
  const [reveladasRec, setReveladasRec] = useState<number[]>([]);
  const [emparejadasRec, setEmparejadasRec] = useState<number[]>([]);
  const [intentosRec, setIntentosRec] = useState(0);
  const [resultadoRec, setResultadoRec] = useState<string | null>(null);

  useEffect(() => {
    let activa = true;
    void Asset.loadAsync(Object.values(imagenes)).catch(() => {
      if (activa) {
        setAviso('No se pudieron preparar las imágenes de las cartas.');
        Vibration.vibrate(180);
      }
    }).finally(() => {
      if (activa) setImagenesListas(true);
    });
    return () => { activa = false; };
  }, []);

  useEffect(() => {
    if (!pedidoId) return;
    void iniciarMemotest(pedidoId)
      .then(setJuego)
      .catch((error: unknown) => {
        setAviso(error instanceof Error ? error.message : 'No se pudo preparar Memotest.');
        Vibration.vibrate(180);
      })
      .finally(() => setCargandoPedido(false));
  }, [pedidoId]);

  const cartas = recreativo
    ? mazoRec.map((carta, indice) => reveladasRec.includes(indice) || emparejadasRec.includes(indice) ? carta : null)
    : juego?.cartas ?? [];
  const emparejadas = recreativo ? emparejadasRec : juego?.emparejadas ?? [];
  const intentos = recreativo ? intentosRec : juego?.intentos ?? 0;
  const terminado = recreativo ? Boolean(resultadoRec) : juego ? juego.estado !== 'en_curso' : false;
  const mensajeError = aviso ?? (!pedidoId ? 'No encontramos el pedido para iniciar Memotest.' : null);
  const anchoCarta = Math.floor((Math.min(width - 52, 400) - 12) / 2);
  // Esta medida se toma dentro del área segura, después de cabecera, marcador y navegación Android.
  const separacionCartas = compacto ? 8 : 12;
  const altoCarta = altoGrilla > 0 ? Math.max(40, Math.floor((altoGrilla - separacionCartas * 3) / 4)) : 64;
  const cargando = cargandoPedido || !imagenesListas;

  function iniciarRecreativo() {
    setRecreativo(true);
    setMazoRec(crearMazoMemotest());
    setReveladasRec([]);
    setEmparejadasRec([]);
    setIntentosRec(0);
    setResultadoRec(null);
    setAviso(null);
  }

  async function elegir(indice: number) {
    if (bloqueado || terminado || cartas[indice] !== null) return;
    if (!recreativo && pedidoId) {
      setBloqueado(true);
      try {
        const respuesta = await voltearMemotest(pedidoId, indice);
        setJuego(respuesta);
        if (respuesta.ocultar) {
          setTimeout(() => {
            setJuego((actual) => actual ? {
              ...actual,
              cartas: actual.cartas.map((carta, posicion) => actual.emparejadas.includes(posicion) ? carta : null),
            } : actual);
            setBloqueado(false);
          }, 850);
        } else {
          setBloqueado(false);
        }
      } catch (error) {
        setAviso(error instanceof Error ? error.message : 'No se pudo voltear la carta.');
        Vibration.vibrate(180);
        setBloqueado(false);
      }
      return;
    }

    const nuevas = [...reveladasRec, indice];
    setReveladasRec(nuevas);
    if (nuevas.length !== 2) return;

    setBloqueado(true);
    const nuevosIntentos = intentosRec + 1;
    setIntentosRec(nuevosIntentos);
    const coincide = sonPareja(mazoRec, nuevas[0], nuevas[1]);
    setTimeout(() => {
      const nuevosPares = coincide ? [...emparejadasRec, ...nuevas] : emparejadasRec;
      setEmparejadasRec(nuevosPares);
      setReveladasRec([]);
      setBloqueado(false);
      if (nuevosPares.length === 8) setResultadoRec('Ganaste la partida recreativa.');
      else if (nuevosIntentos >= 6) setResultadoRec('Terminaste la partida recreativa.');
    }, 850);
  }

  if (cargando) return <View className="flex-1 justify-center bg-chido-fondo"><ChidoLoader mensaje="Preparando Memotest…" /></View>;

  const gano = recreativo ? resultadoRec?.startsWith('Ganaste') : juego?.estado === 'ganado';
  const mascota = gano ? require('../../../../assets/images/mascota-contenta-descuento.png') : require('../../../../assets/images/mascota-trsite-descuento.png');

  if (terminado) {
    return (
      <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
        <Header userName="Cliente" role="Memotest" />
        <View className="flex-1" onLayout={alMedir} style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4">
            <Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} />
            <Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text>
          </Pressable>
          {/* La mascota usa solo el espacio libre; la tarjeta de resultado y el botón siempre quedan visibles. */}
          <View className="flex-1 items-center justify-center py-2" style={{ minHeight: 0 }}>
            <Image source={mascota} resizeMode="contain" style={{ width: '100%', height: '100%', maxWidth: 280, maxHeight: 280 }} />
          </View>
          <View className={`mb-3 items-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera ${compacto ? 'p-4' : 'p-6'}`}>
            <Ionicons name={gano ? 'trophy-outline' : 'game-controller-outline'} size={compacto ? 44 : 64} color={colores.textoSobreOscuro} />
            <Text className={`${compacto ? 'mt-2 text-3xl' : 'mt-4 text-4xl'} text-center font-extrabold text-chido-texto-sobre-oscuro`}>Resultado de Memotest</Text>
            <Text className={`${compacto ? 'mt-2 text-xl' : 'mt-3 text-2xl'} text-center font-bold text-chido-texto-secundario-sobre-oscuro`}>{gano ? recreativo ? 'Ganaste la partida recreativa.' : 'Aplicamos 15% de descuento a tu cuenta.' : recreativo ? resultadoRec : 'No alcanzaste los cuatro pares.'}</Text>
            <View className={`${compacto ? 'mt-3 py-2' : 'mt-5 py-3'} rounded-2xl bg-chido-acento px-5`}><Text className="text-xl font-extrabold text-chido-texto-sobre-oscuro">Pares {emparejadas.length / 2} de 4</Text></View>
          </View>
          <Pressable onPress={iniciarRecreativo} accessibilityRole="button" className="min-h-16 flex-row items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-botonPrincipal px-5 py-4">
            <Ionicons name="refresh-outline" size={28} color={colores.textoSobreOscuro} />
            <Text className="ml-3 text-xl font-extrabold text-chido-texto-sobre-oscuro">Nueva partida recreativa</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
      <Header userName="Cliente" role="Memotest" />
      <View className="flex-1" onLayout={alMedir} style={{ paddingHorizontal: 20, paddingTop: compacto ? 12 : 16, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4">
          <Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} />
          <Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text>
        </Pressable>
        <View className={`rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera ${compacto ? 'mt-3 px-4 py-2' : 'mt-4 p-4'}`}>
          <Text className={`${compacto ? 'text-3xl' : 'text-5xl'} font-extrabold text-chido-texto-sobre-oscuro`}>Memotest</Text>
          <Text className={`${compacto ? 'mt-1 text-lg' : 'mt-2 text-2xl'} text-chido-texto-secundario-sobre-oscuro`}>Completá los cuatro pares en seis intentos.</Text>
        </View>
        {/* En pantallas bajas intentos y pares van en una sola fila. */}
        <View className={`items-center rounded-2xl bg-chido-acento px-4 ${compacto ? 'mt-3 py-2' : 'mt-4 py-3'}`}>
          {compacto ? (
            <Text className="text-xl font-extrabold text-chido-texto-sobre-oscuro">Intentos {intentos} de 6 · Pares {emparejadas.length / 2} de 4</Text>
          ) : (
            <>
              <Text className="text-3xl font-extrabold text-chido-texto-sobre-oscuro">Intentos {intentos} de 6</Text>
              <Text className="mt-1 text-2xl font-extrabold text-chido-texto-sobre-oscuro">Pares {emparejadas.length / 2} de 4</Text>
            </>
          )}
        </View>
        {mensajeError && <View className="mt-3 rounded-2xl bg-chido-error p-3"><Text className="text-center font-bold text-chido-texto-sobre-oscuro">{mensajeError}</Text></View>}
        <View className={`items-center justify-center ${compacto ? 'my-1 h-7' : 'mt-3 h-16'}`}>
          {bloqueado && (compacto
            ? <Text className="text-base font-bold text-chido-texto-sobre-oscuro" accessibilityLiveRegion="polite">Recordá las cartas…</Text>
            : <ChidoLoader mensaje="Recordá las cartas…" compacto />)}
        </View>
        <View onLayout={({ nativeEvent }) => setAltoGrilla(Math.round(nativeEvent.layout.height))} className="flex-1 flex-row flex-wrap justify-between" style={{ rowGap: separacionCartas }}>
          {cartas.map((carta, indice) => {
            const imagen = obtenerImagenCarta(carta);
            return (
              <Pressable key={indice} onPress={() => void elegir(indice)} disabled={bloqueado || carta !== null} style={{ width: anchoCarta, height: altoCarta }} className="items-center justify-center overflow-hidden rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera">
                {imagen ? <Image source={imagen} resizeMode="contain" className="h-full w-full" /> : <Ionicons name="restaurant-outline" size={48} color={colores.textoSobreOscuro} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
