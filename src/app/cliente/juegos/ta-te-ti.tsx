import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, useWindowDimensions, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import ChidoLoader from '../../../components/ui/ChidoLoader';
import ChidoLoaderOverlay from '../../../components/ui/ChidoLoaderOverlay';
import { guardarTateti, iniciarTateti, resolverTateti } from '../../../services/juegos';
import { colores } from '../../../theme/colores';
import type { EstadoJuego, EstadoRondaTateti, IntentoJuego, PartidaTateti } from '../../../types/juegos';
import { estadoRondaTateti, ganadorTateti, jugadaAplicacion, resultadoSerieTateti, tableroLleno } from '../../../utils/taTeTi';

function nuevaPartida(puntosCliente = 0, puntosAplicacion = 0, ronda = 1): PartidaTateti {
  return { tablero: [null, null, null, null, null, null, null, null, null], turno: 'cliente', ronda, puntosCliente, puntosAplicacion, estadoRonda: 'en_curso' };
}

function normalizarPartida(partida: Partial<PartidaTateti> | null | undefined): PartidaTateti {
  if (!partida?.tablero || partida.tablero.length !== 9) return nuevaPartida();
  const estadoRonda = partida.estadoRonda as EstadoRondaTateti | undefined;
  return {
    tablero: partida.tablero,
    turno: partida.turno === 'aplicacion' ? 'aplicacion' : 'cliente',
    ronda: Math.min(5, Math.max(1, partida.ronda ?? 1)),
    puntosCliente: partida.puntosCliente ?? 0,
    puntosAplicacion: partida.puntosAplicacion ?? 0,
    estadoRonda: estadoRonda === 'cliente' || estadoRonda === 'aplicacion' || estadoRonda === 'empate' || estadoRonda === 'en_curso'
      ? estadoRonda
      : estadoRondaTateti(partida.tablero),
  };
}

function mensajeDeRonda(estadoRonda: EstadoRondaTateti) {
  if (estadoRonda === 'cliente') return 'Ganaste esta ronda.';
  if (estadoRonda === 'aplicacion') return 'La aplicación ganó esta ronda.';
  if (estadoRonda === 'empate') return 'Esta ronda terminó en empate.';
  return null;
}

export default function Tateti() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const { pedidoId } = useLocalSearchParams<{ pedidoId: string }>();
  const [intento, setIntento] = useState<IntentoJuego | null>(null);
  const [partida, setPartida] = useState<PartidaTateti>(nuevaPartida);
  const [cargando, setCargando] = useState(() => Boolean(pedidoId));
  const [guardando, setGuardando] = useState(false);
  const [modoRecreativo, setModoRecreativo] = useState(false);
  const [mensajeRonda, setMensajeRonda] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [altoTableroDisponible, setAltoTableroDisponible] = useState(0);

  useEffect(() => {
    if (!pedidoId) return;
    void iniciarTateti(pedidoId).then((respuesta) => {
      const partidaInicial = normalizarPartida(respuesta.partida);
      setIntento(respuesta);
      setPartida(partidaInicial);
      setMensajeRonda(mensajeDeRonda(partidaInicial.estadoRonda));
    }).catch((error: unknown) => {
      setAviso(error instanceof Error ? error.message : 'No se pudo preparar Ta-te-ti.');
      Vibration.vibrate(180);
    }).finally(() => setCargando(false));
  }, [pedidoId]);

  async function guardar(partidaActualizada: PartidaTateti) {
    if (!pedidoId || modoRecreativo) return null;
    setGuardando(true);
    try {
      return await guardarTateti(pedidoId, partidaActualizada);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo guardar la partida.');
      Vibration.vibrate(180);
      return null;
    } finally {
      setGuardando(false);
    }
  }

  async function terminarPartida(estado: Exclude<EstadoJuego, 'en_curso'>, partidaFinal: PartidaTateti) {
    if (modoRecreativo) {
      setPartida(partidaFinal);
      setMensajeRonda(estado === 'ganado' ? 'Ganaste esta partida recreativa.' : estado === 'perdido' ? 'La aplicación ganó esta partida recreativa.' : 'La partida recreativa terminó en empate.');
      return;
    }
    if (!pedidoId) return;
    setGuardando(true);
    setPartida(partidaFinal);
    try {
      await guardarTateti(pedidoId, partidaFinal);
      const respuesta = await resolverTateti(pedidoId, estado);
      setIntento(respuesta);
      setPartida(partidaFinal);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo guardar el resultado.');
      Vibration.vibrate(180);
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarRonda(resultado: 'cliente' | 'aplicacion' | 'empate', tablero: PartidaTateti['tablero']) {
    const puntosCliente = partida.puntosCliente + (resultado === 'cliente' ? 1 : 0);
    const puntosAplicacion = partida.puntosAplicacion + (resultado === 'aplicacion' ? 1 : 0);
    const estadoRonda: EstadoRondaTateti = resultado;
    const partidaFinal = { ...partida, tablero, turno: 'cliente' as const, puntosCliente, puntosAplicacion, estadoRonda };
    const estadoSerie = resultadoSerieTateti(partida.ronda, puntosCliente, puntosAplicacion);
    if (estadoSerie) {
      setMensajeRonda(mensajeDeRonda(estadoRonda));
      await terminarPartida(estadoSerie, partidaFinal);
      return;
    }
    setPartida(partidaFinal);
    setMensajeRonda(mensajeDeRonda(estadoRonda));
    await guardar(partidaFinal);
  }

  async function elegirCasilla(indice: number) {
    const enJuego = modoRecreativo || intento?.estado === 'en_curso';
    if (!enJuego || guardando || partida.estadoRonda !== 'en_curso' || partida.tablero[indice] !== null || partida.turno !== 'cliente') return;
    setMensajeRonda(null);
    const tableroCliente = [...partida.tablero] as PartidaTateti['tablero'];
    tableroCliente[indice] = 'X';
    setPartida({ ...partida, tablero: tableroCliente, turno: 'aplicacion' });
    if (ganadorTateti(tableroCliente) === 'X') return cerrarRonda('cliente', tableroCliente);
    if (tableroLleno(tableroCliente)) return cerrarRonda('empate', tableroCliente);

    setGuardando(true);
    await new Promise<void>((resolver) => setTimeout(resolver, 550));
    const jugada = jugadaAplicacion(tableroCliente);
    if (jugada >= 0) tableroCliente[jugada] = 'O';
    setGuardando(false);
    if (ganadorTateti(tableroCliente) === 'O') return cerrarRonda('aplicacion', tableroCliente);
    if (tableroLleno(tableroCliente)) return cerrarRonda('empate', tableroCliente);
    const siguiente = { ...partida, tablero: tableroCliente, turno: 'cliente' as const };
    setPartida(siguiente);
    await guardar(siguiente);
  }

  async function siguienteRonda() {
    if (guardando || partida.estadoRonda === 'en_curso') return;
    const siguiente = nuevaPartida(partida.puntosCliente, partida.puntosAplicacion, partida.ronda + 1);
    if (modoRecreativo) {
      setPartida(siguiente);
      setMensajeRonda(null);
      return;
    }
    if (!pedidoId) return;
    const respuesta = await guardar(siguiente);
    if (!respuesta) return;
    setIntento(respuesta);
    setPartida(normalizarPartida(respuesta.partida));
    setMensajeRonda(null);
  }

  function jugarDeNuevo() {
    setModoRecreativo(true);
    setPartida(nuevaPartida());
    setMensajeRonda(null);
    setAviso(null);
  }

  if (cargando) return <View className="flex-1 justify-center bg-chido-fondo"><ChidoLoader mensaje="Preparando Ta-te-ti…" /></View>;

  const finalizado = Boolean(intento && intento.estado !== 'en_curso' && !modoRecreativo);
  const estadoSerie = resultadoSerieTateti(partida.ronda, partida.puntosCliente, partida.puntosAplicacion);
  const serieRecreativaFinalizada = Boolean(modoRecreativo && estadoSerie);
  const mostrarNuevaPartida = finalizado || serieRecreativaFinalizada;
  const mensajeError = aviso ?? (!pedidoId ? 'No encontramos el pedido para iniciar el juego.' : null);
  const mensajeFinal = !modoRecreativo && intento?.estado === 'ganado'
    ? intento.descuento_otorgado === 10 ? 'Ganaste el mejor de cinco. Aplicamos 10% de descuento a tu cuenta.' : 'Ganaste, pero tu cuenta ya tenía un descuento aplicado.'
    : !modoRecreativo && intento?.estado === 'perdido' ? 'La aplicación ganó el mejor de cinco. Podés jugar nuevamente en modo recreativo.'
      : !modoRecreativo && intento?.estado === 'empate' ? 'No alcanzaste tres rondas ganadas. Podés jugar nuevamente en modo recreativo.' : null;
  const mensajeFinalRecreativo = modoRecreativo && estadoSerie === 'ganado'
    ? 'Ganaste tres rondas en esta serie recreativa.'
    : modoRecreativo && estadoSerie === 'perdido' ? 'La aplicación ganó esta serie recreativa.'
      : modoRecreativo && estadoSerie === 'empate' ? 'La serie recreativa terminó sin tres victorias.' : null;
  const rondaTerminada = partida.estadoRonda !== 'en_curso';
  const puedeAvanzar = !estadoSerie && partida.ronda < 5;
  const tableroSize = Math.min(width - 40, altoTableroDisponible > 0 ? altoTableroDisponible : height < 720 ? 200 : height < 820 ? 280 : 340);
  const tieneDescuentoAplicado = intento?.descuento_otorgado === 10;
  const mensajePromocion = modoRecreativo && tieneDescuentoAplicado
    ? 'Ya tenés el 10% de descuento aplicado.'
    : 'Ganando tres rondas obtenés 10% de descuento.';
  const mascotaFinal = estadoSerie === 'ganado'
    ? require('../../../../assets/images/mascota-contenta-descuento.png')
    : require('../../../../assets/images/mascota-trsite-descuento.png');
  const tamanioMascotaFinal = height < 720 ? 120 : height < 820 ? 165 : 205;

  if (rondaTerminada && estadoSerie) {
    const resultado = mensajeFinal ?? mensajeFinalRecreativo ?? mensajeRonda ?? 'La ronda terminó.';
    const iconoResultado = estadoSerie === 'ganado' ? 'trophy-outline' : estadoSerie === 'perdido' ? 'game-controller-outline' : 'flag-outline';

    return (
      <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
        <Header userName="Cliente" role="Ta-te-ti" />
        <View className="flex-1 px-5 py-4">
          <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4"><Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} /><Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text></Pressable>
          <View className="relative flex-1 justify-center">
            <Image source={mascotaFinal} resizeMode="contain" style={{ width: tamanioMascotaFinal, height: tamanioMascotaFinal }} className="mb-3 self-center" />
            <View className="items-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-6">
              <Ionicons name={iconoResultado} size={64} color={colores.textoSobreOscuro} />
              <Text className="mt-4 text-center text-4xl font-extrabold text-chido-texto-sobre-oscuro">Resultado del mejor de cinco</Text>
              <Text className="mt-3 text-center text-2xl font-bold text-chido-texto-secundario-sobre-oscuro">{resultado}</Text>
              <View className="mt-5 flex-row rounded-2xl bg-chido-acento px-5 py-3"><Text className="text-xl font-extrabold text-chido-texto-sobre-oscuro">Vos {partida.puntosCliente} - {partida.puntosAplicacion} Aplicación</Text></View>
            </View>
            {mensajeError && <View className="mt-4 rounded-2xl bg-chido-error p-4"><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{mensajeError}</Text></View>}
            {guardando && <ChidoLoaderOverlay mensaje="Guardando el resultado…" />}
          </View>
          {puedeAvanzar && <Pressable disabled={guardando} onPress={() => void siguienteRonda()} accessibilityRole="button" className={`min-h-16 flex-row items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo px-5 py-4 ${guardando ? 'bg-chido-cabecera opacity-60' : 'bg-chido-botonPrincipal'}`}><Ionicons name="arrow-forward-circle-outline" size={28} color={colores.textoSobreOscuro} /><Text className="ml-3 text-center text-xl font-extrabold text-chido-texto-sobre-oscuro">Siguiente ronda</Text></Pressable>}
          {mostrarNuevaPartida && <Pressable onPress={jugarDeNuevo} accessibilityRole="button" className="min-h-16 flex-row items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-botonPrincipal px-5 py-4"><Ionicons name="refresh-outline" size={28} color={colores.textoSobreOscuro} /><Text className="ml-3 text-center text-xl font-extrabold text-chido-texto-sobre-oscuro">Nueva partida recreativa</Text></Pressable>}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
      <Header userName="Cliente" role="Ta-te-ti" />
      <View className="flex-1 px-5 py-4">
        <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4"><Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} /><Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text></Pressable>
        <View className="mt-4 rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-4">
          <Text className="text-5xl font-extrabold text-chido-texto-sobre-oscuro">Ta-te-ti</Text>
          <Text className="mt-2 text-2xl text-chido-texto-secundario-sobre-oscuro">{mensajePromocion}</Text>
        </View>
        {mensajeError && <View className="mt-3 rounded-2xl bg-chido-error p-3"><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{mensajeError}</Text></View>}
        <View className="mt-4 items-center rounded-2xl bg-chido-acento px-4 py-3">
          <Text className="text-4xl font-extrabold text-chido-texto-sobre-oscuro">Ronda {partida.ronda} de 5</Text>
          <Text className="mt-1 text-2xl font-extrabold text-chido-texto-sobre-oscuro">Vos {partida.puntosCliente} - {partida.puntosAplicacion} Aplicación</Text>
        </View>
        <View onLayout={({ nativeEvent }) => setAltoTableroDisponible(Math.floor(nativeEvent.layout.height))} className="relative flex-1 items-center justify-center">
          <View style={{ width: tableroSize, height: tableroSize }} className="flex-row flex-wrap overflow-hidden rounded-3xl border-4 border-chido-texto-secundario-alternativo bg-chido-cabecera">
            {partida.tablero.map((marca, indice) => <Pressable key={indice} accessibilityRole="button" accessibilityLabel={`Casilla ${indice + 1}${marca ? `, ${marca}` : ''}`} disabled={!intento || finalizado || guardando || partida.estadoRonda !== 'en_curso' || marca !== null} onPress={() => void elegirCasilla(indice)} className="h-1/3 w-1/3 items-center justify-center border border-chido-borde-naranja">
              <Text className={`text-7xl font-extrabold ${marca === 'X' ? 'text-chido-aviso' : 'text-chido-texto-secundario-alternativo'}`}>{marca ?? ''}</Text>
            </Pressable>)}
          </View>
          {guardando && <ChidoLoaderOverlay mensaje="La aplicación está pensando…" />}
        </View>
        {rondaTerminada && puedeAvanzar ? <Pressable disabled={guardando} onPress={() => void siguienteRonda()} accessibilityRole="button" className={`min-h-16 flex-row items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo px-5 py-4 ${guardando ? 'bg-chido-cabecera opacity-60' : 'bg-chido-botonPrincipal'}`}><Ionicons name="arrow-forward-circle-outline" size={28} color={colores.textoSobreOscuro} /><Text className="ml-3 text-center text-xl font-extrabold text-chido-texto-sobre-oscuro">Siguiente ronda</Text></Pressable> : <View className="min-h-16" />}
      </View>
    </SafeAreaView>
  );
}
