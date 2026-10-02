import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import ChidoLoader from '../../../components/ui/ChidoLoader';
import { guardarTateti, iniciarTateti, resolverTateti } from '../../../services/juegos';
import { colores } from '../../../theme/colores';
import type { EstadoJuego, IntentoJuego, PartidaTateti } from '../../../types/juegos';
import { ganadorTateti, jugadaAplicacion, tableroLleno } from '../../../utils/taTeTi';

function nuevaPartida(puntosCliente = 0, puntosAplicacion = 0, ronda = 1): PartidaTateti {
  return { tablero: [null, null, null, null, null, null, null, null, null], turno: 'cliente', ronda, puntosCliente, puntosAplicacion };
}

function normalizarPartida(partida: Partial<PartidaTateti> | null | undefined): PartidaTateti {
  if (!partida?.tablero || partida.tablero.length !== 9) return nuevaPartida();
  return {
    tablero: partida.tablero,
    turno: partida.turno === 'aplicacion' ? 'aplicacion' : 'cliente',
    ronda: Math.min(5, Math.max(1, partida.ronda ?? 1)),
    puntosCliente: partida.puntosCliente ?? 0,
    puntosAplicacion: partida.puntosAplicacion ?? 0,
  };
}

export default function Tateti() {
  const router = useRouter();
  const { pedidoId } = useLocalSearchParams<{ pedidoId: string }>();
  const [intento, setIntento] = useState<IntentoJuego | null>(null);
  const [partida, setPartida] = useState<PartidaTateti>(nuevaPartida);
  const [cargando, setCargando] = useState(() => Boolean(pedidoId));
  const [guardando, setGuardando] = useState(false);
  const [modoRecreativo, setModoRecreativo] = useState(false);
  const [mensajeRonda, setMensajeRonda] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!pedidoId) return;
    void iniciarTateti(pedidoId).then((respuesta) => {
      setIntento(respuesta);
      setPartida(normalizarPartida(respuesta.partida));
    }).catch((error: unknown) => {
      setAviso(error instanceof Error ? error.message : 'No se pudo preparar Ta-te-ti.');
      Vibration.vibrate(180);
    }).finally(() => setCargando(false));
  }, [pedidoId]);

  async function guardar(partidaActualizada: PartidaTateti) {
    if (!pedidoId || modoRecreativo) return;
    setGuardando(true);
    try {
      await guardarTateti(pedidoId, partidaActualizada);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo guardar la partida.');
      Vibration.vibrate(180);
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
    const partidaFinal = { ...partida, tablero, turno: 'cliente' as const, puntosCliente, puntosAplicacion };
    const termino = partida.ronda === 5 || puntosCliente === 3 || puntosAplicacion === 3;
    if (termino) {
      const estado = puntosCliente > puntosAplicacion ? 'ganado' : puntosAplicacion > puntosCliente ? 'perdido' : 'empate';
      await terminarPartida(estado, partidaFinal);
      return;
    }
    setPartida(partidaFinal);
    setMensajeRonda(resultado === 'cliente' ? 'Ganaste esta ronda.' : resultado === 'aplicacion' ? 'La aplicación ganó esta ronda.' : 'Esta ronda terminó en empate.');
    await guardar(partidaFinal);
  }

  async function elegirCasilla(indice: number) {
    const enJuego = modoRecreativo || intento?.estado === 'en_curso';
    if (!enJuego || guardando || partida.tablero[indice] !== null || partida.turno !== 'cliente') return;
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

  function siguienteRonda() {
    const siguiente = nuevaPartida(partida.puntosCliente, partida.puntosAplicacion, partida.ronda + 1);
    setPartida(siguiente);
    setMensajeRonda(null);
    void guardar(siguiente);
  }

  function jugarDeNuevo() {
    setModoRecreativo(true);
    setPartida(nuevaPartida());
    setMensajeRonda(null);
    setAviso(null);
  }

  if (cargando) return <View className="flex-1 justify-center bg-chido-fondo"><ChidoLoader mensaje="Preparando Ta-te-ti…" /></View>;

  const finalizado = intento?.estado !== 'en_curso' && !modoRecreativo;
  const mensajeError = aviso ?? (!pedidoId ? 'No encontramos el pedido para iniciar el juego.' : null);
  const mensajeFinal = intento?.estado === 'ganado'
    ? intento.descuento_otorgado === 10 ? 'Ganaste el mejor de cinco. Aplicamos 10% de descuento a tu cuenta.' : 'Ganaste, pero tu cuenta ya tenía un descuento aplicado.'
    : intento?.estado === 'perdido' ? 'La aplicación ganó el mejor de cinco. Podés jugar nuevamente en modo recreativo.'
      : intento?.estado === 'empate' ? 'El mejor de cinco terminó en empate. Podés jugar nuevamente en modo recreativo.' : null;

  return (
    <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
      <Header userName="Cliente" role="Ta-te-ti" />
      <View className="flex-1 px-5 py-4">
        <Pressable onPress={() => router.back()} accessibilityRole="button" className="min-h-12 self-start flex-row items-center rounded-xl bg-chido-acento px-4"><Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} /><Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">Volver a juegos</Text></Pressable>
        <View className="mt-4 rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-5">
          <Text className="text-3xl font-extrabold text-chido-texto-sobre-oscuro">Ta-te-ti</Text>
          <Text className="mt-2 text-lg text-chido-texto-secundario-sobre-oscuro">Mejor de cinco rondas. Vos jugás con X y la aplicación responde con O.</Text>
          <Text className="mt-2 text-base font-extrabold text-chido-aviso">Primer intento ganador: 10% de descuento.</Text>
        </View>
        {mensajeError && <View className="mt-4 rounded-2xl bg-chido-error p-4"><Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">{mensajeError}</Text></View>}
        <View className="mt-4 flex-row justify-between rounded-2xl bg-chido-acento px-5 py-3"><Text className="text-lg font-extrabold text-chido-texto-sobre-oscuro">Ronda {partida.ronda} de 5</Text><Text className="text-lg font-extrabold text-chido-texto-sobre-oscuro">Vos {partida.puntosCliente} - {partida.puntosAplicacion} Aplicación</Text></View>
        <View className="mt-4 aspect-square w-full max-w-sm flex-row flex-wrap self-center overflow-hidden rounded-3xl border-4 border-chido-texto-secundario-alternativo bg-chido-cabecera">
          {partida.tablero.map((marca, indice) => <Pressable key={indice} accessibilityRole="button" accessibilityLabel={`Casilla ${indice + 1}${marca ? `, ${marca}` : ''}`} disabled={!intento || finalizado || guardando || !!mensajeRonda || marca !== null} onPress={() => void elegirCasilla(indice)} className="h-1/3 w-1/3 items-center justify-center border border-chido-borde-naranja">
            <Text className={`text-6xl font-extrabold ${marca === 'X' ? 'text-chido-aviso' : 'text-chido-texto-secundario-alternativo'}`}>{marca ?? ''}</Text>
          </Pressable>)}
        </View>
        {guardando && <View className="mt-4"><ChidoLoader mensaje="La aplicación está pensando…" /></View>}
        {mensajeRonda && <View className="mt-4 rounded-2xl bg-chido-cabecera p-4"><Text className="text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">{mensajeRonda}</Text></View>}
        {mensajeRonda && !finalizado && !modoRecreativo && partida.ronda < 5 && <Pressable onPress={siguienteRonda} accessibilityRole="button" className="mt-4 rounded-2xl bg-chido-botonPrincipal p-4"><Text className="text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">Siguiente ronda</Text></Pressable>}
        {mensajeFinal && <View className="mt-4 rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-5"><Text className="text-center text-xl font-extrabold text-chido-texto-sobre-oscuro">{mensajeFinal}</Text></View>}
        {(finalizado || (modoRecreativo && mensajeRonda)) && <Pressable onPress={jugarDeNuevo} accessibilityRole="button" className="mt-4 rounded-2xl bg-chido-botonPrincipal p-4"><Text className="text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">Jugar de nuevo</Text></Pressable>}
      </View>
    </SafeAreaView>
  );
}
