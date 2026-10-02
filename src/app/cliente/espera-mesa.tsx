import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { useAppSession } from '../../contexts/AppSessionContext';
import { obtenerEstadoSolicitudMesa, type EstadoSolicitudMesa } from '../../services/mesas';
import { colores } from '../../theme/colores';

export default function EsperaMesaCliente() {
  const router = useRouter();
  const { usuario } = useAppSession();
  const clienteId = usuario?.id;
  const [estado, setEstado] = useState<EstadoSolicitudMesa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const consultarEstado = useCallback(async (manual = false) => {
    if (!clienteId) {
      setAviso('No pudimos identificar tu cuenta para consultar la solicitud.');
      setCargando(false);
      return;
    }
    if (manual) setActualizando(true);
    try {
      setAviso(null);
      setEstado(await obtenerEstadoSolicitudMesa(clienteId));
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo consultar el estado de la mesa.');
      Vibration.vibrate(180);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [clienteId]);

  useFocusEffect(useCallback(() => {
    void consultarEstado();
    const intervalo = setInterval(() => void consultarEstado(), 10000);
    return () => clearInterval(intervalo);
  }, [consultarEstado]));

  if (cargando) return <View className="flex-1 justify-center bg-chido-fondo"><ChidoLoader mensaje="Consultando tu solicitud…" /></View>;

  const mesa = estado?.mesa;
  const sinSolicitud = !mesa && !estado?.enEspera;
  return (
    <SafeAreaView className="flex-1 bg-chido-fondo" edges={['left', 'right', 'bottom']}>
      <Header userName="Cliente" role="Mesa" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <View className="rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-6">
          <View className="items-center">
            <Ionicons name={mesa ? 'restaurant-outline' : 'time-outline'} size={76} color={colores.textoSecundarioAlternativo} />
            <Text className="mt-5 text-center text-3xl font-extrabold text-chido-texto-sobre-oscuro">{mesa ? 'Tu mesa está lista' : sinSolicitud ? 'Sin solicitud activa' : 'Solicitud enviada'}</Text>
            <Text className="mt-3 text-center text-lg text-chido-texto-secundario-sobre-oscuro">
              {mesa ? `El metre te asignó la mesa ${mesa.numero}, tipo ${mesa.tipo === 'VIP' ? 'preferencial' : mesa.tipo}.` : sinSolicitud ? 'Volvé a Inicio para solicitar una mesa.' : 'Esperá mientras el metre te asigna una mesa disponible.'}
            </Text>
          </View>
          {aviso && <View className="mt-5 rounded-2xl bg-chido-error p-4"><Text className="text-center font-bold text-chido-texto-sobre-oscuro">{aviso}</Text></View>}
          {mesa ? <Pressable accessibilityRole="button" onPress={() => router.replace('/cliente/menu')} className="mt-6 min-h-14 items-center justify-center rounded-2xl bg-chido-botonPrincipal px-4"><Text className="text-lg font-extrabold text-chido-texto-sobre-oscuro">Ir al menú</Text></Pressable> : actualizando ? <ChidoLoader mensaje="Actualizando estado…" /> : !sinSolicitud && <Pressable accessibilityRole="button" onPress={() => void consultarEstado(true)} className="mt-6 min-h-14 flex-row items-center justify-center rounded-2xl bg-chido-botonPrincipal px-4"><Ionicons name="refresh-outline" size={23} color={colores.textoSobreOscuro} /><Text className="ml-2 text-lg font-extrabold text-chido-texto-sobre-oscuro">Actualizar estado</Text></Pressable>}
          <Pressable accessibilityRole="button" onPress={() => router.back()} className="mt-4 min-h-12 items-center justify-center rounded-2xl bg-chido-acento px-4"><Text className="text-base font-extrabold text-chido-texto-sobre-oscuro">Volver a Inicio</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
