import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, Vibration, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAppSession } from '../../contexts/AppSessionContext';
import { obtenerRutaNotificacion } from '../../utils/notificaciones';
import { escucharRespuestasPush, permisoNotificacionesConcedido, registrarDispositivoPush, solicitarPermisoNotificaciones } from '../../services/notificaciones-push';
import ChidoLoader from '../ui/ChidoLoader';

const claveExplicacion = (usuarioId: string) => `chido:push:explicacion:v1:${usuarioId}`;

export default function PushNotificationsBootstrap() {
  const { mode, usuario, cargando } = useAppSession();
  const router = useRouter();
  const [mostrar, setMostrar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autenticado = mode === 'authenticated' && !!usuario && !cargando;

  useEffect(() => {
    const detener = escucharRespuestasPush((datos) => {
      const ruta = obtenerRutaNotificacion(datos);
      if (ruta) router.push(ruta);
    });
    return detener;
  }, [router]);

  useEffect(() => {
    if (!autenticado || !usuario) {
      return;
    }
    let activo = true;
    void (async () => {
      try {
        if (await permisoNotificacionesConcedido()) {
          await registrarDispositivoPush();
          return;
        }
        const explicacionVista = await AsyncStorage.getItem(claveExplicacion(usuario.id));
        if (activo && !explicacionVista) setMostrar(true);
      } catch {
        // El registro se reintenta al recuperar la aplicación o renovar el token.
      }
    })();
    return () => { activo = false; };
  }, [autenticado, usuario]);

  async function continuar() {
    if (!usuario || ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      await AsyncStorage.setItem(claveExplicacion(usuario.id), 'vista');
      const concedido = await solicitarPermisoNotificaciones();
      if (concedido) await registrarDispositivoPush();
      setMostrar(false);
    } catch {
      setError('No pudimos activar los avisos. Volvé a intentarlo.');
      Vibration.vibrate(180);
    } finally {
      setOcupado(false);
    }
  }

  async function ahoraNo() {
    if (!usuario || ocupado) return;
    await AsyncStorage.setItem(claveExplicacion(usuario.id), 'vista');
    setMostrar(false);
  }

  return <Modal visible={mostrar && autenticado} transparent animationType="fade" onRequestClose={() => void ahoraNo()}>
    <View className="flex-1 justify-center bg-chido-cabecera/80 px-6">
      <View className="rounded-3xl border-2 border-chido-acento bg-chido-fondo p-6">
        <Text className="text-center text-2xl font-extrabold text-chido-texto-sobre-oscuro">Activá los avisos de Chido</Text>
        <Text className="mt-4 text-center text-lg leading-6 text-chido-texto-secundario-sobre-oscuro">Te informaremos sobre solicitudes, pedidos y otros cambios relacionados con tu rol.</Text>
        {ocupado && <ChidoLoader mensaje="Activando avisos…" />}
        {error && <Text className="mt-4 rounded-xl bg-chido-error p-3 text-center text-base font-semibold text-chido-texto-sobre-oscuro" accessibilityLiveRegion="assertive">{error}</Text>}
        <Pressable disabled={ocupado} onPress={() => void continuar()} className="mt-6 rounded-2xl bg-chido-acento p-4" accessibilityRole="button">
          <Text className="text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">Activar avisos</Text>
        </Pressable>
        <Pressable disabled={ocupado} onPress={() => void ahoraNo()} className="mt-3 rounded-2xl border-2 border-chido-acento p-4" accessibilityRole="button">
          <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Ahora no</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
}
