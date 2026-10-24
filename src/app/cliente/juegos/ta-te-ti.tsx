import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, useWindowDimensions, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import { useNombreCliente } from '../../../hooks/useNombreCliente';
import ChidoLoader from '../../../components/ui/ChidoLoader';
import ChidoLoaderOverlay from '../../../components/ui/ChidoLoaderOverlay';
import { useAltoDisponible } from '../../../hooks/useAltoDisponible';
import { guardarTateti, iniciarTateti, resolverTateti } from '../../../services/juegos';
import { colores } from '../../../theme/colores';
import type { EstadoJuego, EstadoRondaTateti, IntentoJuego, PartidaTateti, TableroTateti } from '../../../types/juegos';
import { estadoRondaTateti, ganadorTateti, jugadaAplicacion, resultadoSerieTateti, tableroLleno } from '../../../utils/taTeTi';

function nuevaPartida(puntosCliente = 0, puntosAplicacion = 0, ronda = 1): PartidaTateti {
  return { tablero: [null, null, null, null, null, null, null, null, null], turno: 'cliente', ronda, puntosCliente, puntosAplicacion, estadoRonda: 'en_curso' };
}

function normalizarPartida(partida: Partial<PartidaTateti> | null | undefined): PartidaTateti {
  if (!partida?.tablero || partida.tablero.length !== 9) return nuevaPartida();
  const estadoRonda = partida.estadoRonda as EstadoRondaTateti | undefined;
  return {
    tablero: partida.tablero as TableroTateti,
    turno: partida.turno === 'aplicacion' ? 'aplicacion' : 'cliente',
    ronda: Math.min(5, Math.max(1, partida.ronda ?? 1)),
    puntosCliente: partida.puntosCliente ?? 0,
    puntosAplicacion: partida.puntosAplicacion ?? 0,
    estadoRonda: estadoRonda === 'cliente' || estadoRonda === 'aplicacion' || estadoRonda === 'empate' || estadoRonda === 'en_curso'
      ? estadoRonda
      : estadoRondaTateti(partida.tablero as TableroTateti),
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
  const { alMedir, compacto } = useAltoDisponible();
  const { pedidoId, recreativo: recreativoParam, clienteAnonimoId } = useLocalSearchParams<{ pedidoId: string; recreativo?: string; clienteAnonimoId?: string }>();
  const recreativoInicial = recreativoParam === 'true';
  const { nombreCliente } = useNombreCliente(clienteAnonimoId);
  const [intento, setIntento] = useState<IntentoJuego | null>(null);
  const [partida, setPartida] = useState<PartidaTateti>(nuevaPartida);
  const [cargando, setCargando] = useState(() => Boolean(pedidoId) && !recreativoInicial);
  const [guardando, setGuardando] = useState(false);
  const [modoRecreativo, setModoRecreativo] = useState(recreativoInicial);
  const [mensajeRonda, setMensajeRonda] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [altoTableroDisponible, setAltoTableroDisponible] = useState(0);

  useEffect(() => {
    if (!pedidoId || recreativoInicial) return;
    void iniciarTateti(pedidoId).then((respuesta) => {
      const partidaInicial = normalizarPartida(respuesta.partida);
      setIntento(respuesta);
      setPartida(partidaInicial);
      setMensajeRonda(mensajeDeRonda(partidaInicial.estadoRonda));
    }).catch((error: unknown) => {
      setAviso(error instanceof Error ? error.message : 'No se pudo preparar Ta-te-ti.');
      Vibration.vibrate(180);
    }).finally(() => setCargando(false));
  }, [pedidoId, recreativoInicial]);

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

  function jugarDeNuevo() {
    setModoRecreativo(true);
    setPartida(nuevaPartida());
    setMensajeRonda(null);
    setAviso(null);
  }

  async function elegirCasilla(indice: number) {
    if ((!modoRecreativo && !intento) || guardando || partida.estadoRonda !== 'en_curso' || partida.tablero[indice] !== null) return;
    const tableroConCliente = [...partida.tablero] as TableroTateti;
    tableroConCliente[indice] = 'X';
    const ganadorCliente = ganadorTateti(tableroConCliente);
    if (ganadorCliente === 'X') {
      const puntosCliente = partida.puntosCliente + 1;
      const estadoSerie = resultadoSerieTateti(partida.ronda, puntosCliente, partida.puntosAplicacion);
      const partidaFinal: PartidaTateti = { ...partida, tablero: tableroConCliente, puntosCliente, estadoRonda: 'cliente', turno: 'cliente' };
      if (estadoSerie) await terminarPartida(estadoSerie, partidaFinal);
      else {
        setPartida(partidaFinal);
        setMensajeRonda('Ganaste esta ronda.');
        await guardar(partidaFinal);
      }
      return;
    }

    if (tableroLleno(tableroConCliente)) {
      const estadoSerie = resultadoSerieTateti(partida.ronda, partida.puntosCliente, partida.puntosAplicacion);
      const partidaFinal: PartidaTateti = { ...partida, tablero: tableroConCliente, estadoRonda: 'empate', turno: 'cliente' };
      if (estadoSerie) await terminarPartida(estadoSerie, partidaFinal);
      else {
        setPartida(partidaFinal);
        setMensajeRonda('Esta ronda terminó en empate.');
        await guardar(partidaFinal);
      }
      return;
    }

    const casillaApp = jugadaAplicacion(tableroConCliente);
    if (casillaApp === null) return;
    const tableroConApp = [...tableroConCliente] as TableroTateti;
    tableroConApp[casillaApp] = 'O';
    const ganadorApp = ganadorTateti(tableroConApp);
    if (ganadorApp === 'O') {
      const puntosAplicacion = partida.puntosAplicacion + 1;
      const estadoSerie = resultadoSerieTateti(partida.ronda, partida.puntosCliente, puntosAplicacion);
      const partidaFinal: PartidaTateti = { ...partida, tablero: tableroConApp, puntosAplicacion, estadoRonda: 'aplicacion', turno: 'cliente' };
      if (estadoSerie) await terminarPartida(estadoSerie, partidaFinal);
      else {
        setPartida(partidaFinal);
        setMensajeRonda('La aplicación ganó esta ronda.');
        await guardar(partidaFinal);
      }
      return;
    }

    if (tableroLleno(tableroConApp)) {
      const estadoSerie = resultadoSerieTateti(partida.ronda, partida.puntosCliente, partida.puntosAplicacion);
      const partidaFinal: PartidaTateti = { ...partida, tablero: tableroConApp, estadoRonda: 'empate', turno: 'cliente' };
      if (estadoSerie) await terminarPartida(estadoSerie, partidaFinal);
      else {
        setPartida(partidaFinal);
        setMensajeRonda('Esta ronda terminó en empate.');
        await guardar(partidaFinal);
      }
      return;
    }

    const partidaEnCurso: PartidaTateti = { ...partida, tablero: tableroConApp, turno: 'cliente', estadoRonda: 'en_curso' };
    setPartida(partidaEnCurso);
    setMensajeRonda(null);
    await guardar(partidaEnCurso);
  }

  async function siguienteRonda() {
    if (guardando || partida.ronda >= 5) return;
    const nueva: PartidaTateti = {
      ...nuevaPartida(partida.puntosCliente, partida.puntosAplicacion, partida.ronda + 1),
    };
    setPartida(nueva);
    setMensajeRonda(null);
    await guardar(nueva);
  }

  if (cargando) return <View className="flex-1 justify-center bg-chido-fondo"><ChidoLoader mensaje="Preparando Ta-te-ti…" /></View>;

  const finalizado = !modoRecreativo && Boolean(intento && intento.estado !== 'en_curso');
  const rondaTerminada = partida.estadoRonda !== 'en_curso';
  const puedeAvanzar = rondaTerminada && partida.ronda < 5 && !finalizado;
  const estadoSerie = resultadoSerieTateti(partida.ronda, partida.puntosCliente, partida.puntosAplicacion);
  const serieRecreativaFinalizada = Boolean(modoRecreativo && estadoSerie);
  const mostrarNuevaPartida = finalizado || serieRecreativaFinalizada;
  const mensajeError = aviso ?? (!pedidoId && !modoRecreativo ? 'No encontramos el pedido para iniciar el juego.' : null);
  const mensajeFinal = !modoRecreativo && intento?.estado === 'ganado'
    ? intento.descuento_otorgado === 10 ? 'Ganaste el mejor de cinco. Aplicamos 10% de descuento a tu cuenta.' : 'Ganaste, pero tu cuenta ya tenía un descuento aplicado.'
    : !modoRecreativo && intento?.estado === 'perdido' ? 'La aplicación ganó el mejor de cinco. Podés jugar nuevamente en modo recreativo.'
    : !modoRecreativo && intento?.estado === 'empate' ? 'Empataron la serie. No se aplicó descuento a la cuenta.'
    : modoRecreativo && estadoSerie === 'ganado' ? 'Ganaste el mejor de cinco recreativo.'
    : modoRecreativo && estadoSerie === 'perdido' ? 'La aplicación ganó el mejor de cinco recreativo.'
    : modoRecreativo && estadoSerie === 'empate' ? 'Empataron la serie recreativa.'
    : null;
  const resultado = mensajeFinal ?? mensajeRonda ?? 'En curso';
  const iconoResultado = estadoSerie === 'ganado' ? 'trophy-outline' : 'game-controller-outline';
  const tieneDescuentoAplicado = intento?.descuento_otorgado === 10;
  const mensajePromocion = modoRecreativo && tieneDescuentoAplicado
    ? 'Ya tenés el 10% de descuento aplicado.'
    : modoRecreativo ? 'Partida recreativa sin descuento.' : 'Ganando tres rondas obtenés 10% de descuento.';
  const mascotaFinal = estadoSerie === 'ganado'
    ? require('../../../../assets/images/mascota-contenta-descuento.png')
    : require('../../../../assets/images/mascota-trsite-descuento.png');
  // Se descuentan cabecera (Header), títulos y barra de navegación de Android para que nada se solape.
  const tableroMaximoPorAlto = altoTableroDisponible > 0 ? altoTableroDisponible - 24 : 0;
  const tableroSize = Math.max(160, Math.min(width - 56, tableroMaximoPorAlto > 0 ? tableroMaximoPorAlto : width - 56, 320));

  if (finalizado || serieRecreativaFinalizada) {
    return (
      <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
        <Header userName={nombreCliente} role="Ta-te-ti" />
        <View className="flex-1" onLayout={alMedir} style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4"><Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} /><Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text></Pressable>
          <View className="relative flex-1 mb-3">
            {/* La mascota usa solo el espacio libre; la tarjeta de resultado siempre queda visible. */}
            <View className="flex-1 items-center justify-center py-2" style={{ minHeight: 0 }}>
              <Image source={mascotaFinal} resizeMode="contain" style={{ width: '100%', height: '100%', maxWidth: 205, maxHeight: 205 }} />
            </View>
            <View className={`items-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera ${compacto ? 'p-4' : 'p-6'}`}>
              <Ionicons name={iconoResultado} size={compacto ? 44 : 64} color={colores.textoSobreOscuro} />
              <Text className={`${compacto ? 'mt-2 text-3xl' : 'mt-4 text-4xl'} text-center font-extrabold text-chido-texto-sobre-oscuro`}>Resultado del mejor de cinco</Text>
              <Text className={`${compacto ? 'mt-2 text-xl' : 'mt-3 text-2xl'} text-center font-bold text-chido-texto-secundario-sobre-oscuro`}>{resultado}</Text>
              <View className={`${compacto ? 'mt-3 py-2' : 'mt-5 py-3'} flex-row rounded-2xl bg-chido-acento px-5`}><Text className="text-xl font-extrabold text-chido-texto-sobre-oscuro">Vos {partida.puntosCliente} - {partida.puntosAplicacion} Aplicación</Text></View>
            </View>
            {mensajeError && <View className={`${compacto ? 'mt-2 p-2' : 'mt-4 p-4'} rounded-2xl bg-chido-error`}><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{mensajeError}</Text></View>}
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
      <Header userName={nombreCliente} role="Ta-te-ti" />
      <View className="flex-1" onLayout={alMedir} style={{ paddingHorizontal: 20, paddingTop: compacto ? 12 : 16, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4"><Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} /><Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text></Pressable>
        <View className={`rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera ${compacto ? 'mt-3 px-4 py-2' : 'mt-4 p-4'}`}>
          <Text className={`${compacto ? 'text-3xl' : 'text-5xl'} font-extrabold text-chido-texto-sobre-oscuro`}>Ta-te-ti</Text>
          <Text className={`${compacto ? 'mt-1 text-lg' : 'mt-2 text-2xl'} text-chido-texto-secundario-sobre-oscuro`}>{mensajePromocion}</Text>
        </View>
        {mensajeError && <View className="mt-3 rounded-2xl bg-chido-error p-3"><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{mensajeError}</Text></View>}
        <View className={`items-center rounded-2xl bg-chido-acento px-4 ${compacto ? 'mt-3 py-2' : 'mt-4 py-3'}`}>
          <Text className={`${compacto ? 'text-2xl' : 'text-4xl'} font-extrabold text-chido-texto-sobre-oscuro`}>Ronda {partida.ronda} de 5</Text>
          <Text className={`mt-1 ${compacto ? 'text-lg' : 'text-2xl'} font-extrabold text-chido-texto-sobre-oscuro`}>Vos {partida.puntosCliente} - {partida.puntosAplicacion} Aplicación</Text>
        </View>
        <View onLayout={({ nativeEvent }) => setAltoTableroDisponible(Math.floor(nativeEvent.layout.height))} className="relative my-2 flex-1 items-center justify-center">
          <View style={{ width: tableroSize, height: tableroSize }} className="flex-row flex-wrap overflow-hidden rounded-3xl border-4 border-chido-texto-secundario-alternativo bg-chido-cabecera">
            {partida.tablero.map((marca, indice) => <Pressable key={indice} accessibilityRole="button" accessibilityLabel={`Casilla ${indice + 1}${marca ? `, ${marca}` : ''}`} disabled={(!modoRecreativo && !intento) || finalizado || guardando || partida.estadoRonda !== 'en_curso' || marca !== null} onPress={() => void elegirCasilla(indice)} className="h-1/3 w-1/3 items-center justify-center border border-chido-borde-naranja">
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
