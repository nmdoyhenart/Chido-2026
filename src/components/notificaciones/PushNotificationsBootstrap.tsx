import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, Vibration, View } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';

import { useAppSession } from '../../contexts/AppSessionContext';
import { obtenerRutaNotificacion } from '../../utils/notificaciones';
import {
  escucharRespuestasPush,
  permisoNotificacionesConcedido,
  registrarDispositivoPush,
  solicitarPermisoNotificaciones,
  dispararNotificacionLocal,
} from '../../services/notificaciones-push';
import { supabase } from '../../lib/supabase';
import ChidoLoader from '../ui/ChidoLoader';

const claveExplicacion = (usuarioId: string) => `chido:push:explicacion:v1:${usuarioId}`;

export default function PushNotificationsBootstrap() {
  const { mode, usuario, cargando } = useAppSession();
  const [mostrar, setMostrar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autenticado = mode === 'authenticated' && !!usuario && !cargando;

  useEffect(() => {
    const detener = escucharRespuestasPush((datos) => {
      const ruta = obtenerRutaNotificacion(datos);
      if (ruta) {
        try {
          router.navigate(ruta as Href);
        } catch {
          router.push(ruta as Href);
        }
      }
    });
    return detener;
  }, []);

  // Escuchar eventos en tiempo real para disparar la notificación en el dispositivo.
  // Nuevo pedido, pago informado y chat hacia mozo/cliente registrado ya los envía
  // el servidor como push (triggers notificar_nuevo_pedido, chido_notificar_pago_pedido
  // y chido_notificar_chat); repetirlos acá generaba avisos duplicados.
  useEffect(() => {
    const esAutenticado = autenticado && !!usuario;
    const esInvitado = mode === 'guest';
    if (!esAutenticado && !esInvitado) return;

    const identificadorCanal = usuario?.id || 'invitado';
    const canalNombre = `push_realtime_${identificadorCanal}_${Date.now()}`;
    const canal = supabase
      .channel(canalNombre)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mesas' },
        async (payload) => {
          if (!usuario) return;
          const nuevaMesa = payload.new as any;
          const viejaMesa = payload.old as any;
          if (
            nuevaMesa?.cuenta_solicitada_at &&
            !viejaMesa?.cuenta_solicitada_at &&
            usuario.perfil === 'mozo'
          ) {
            await dispararNotificacionLocal(
              'Solicitud de cuenta',
              `El cliente de la Mesa ${nuevaMesa.numero} solicitó la cuenta.`,
              { ruta: '/mozo/pedidos' }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_mensajes' },
        async (payload) => {
          const nuevo = payload.new as any;
          if (!nuevo) return;

          // Mensaje del mozo hacia el cliente anónimo: no tiene usuario_id, así que el servidor no puede enviarle push.
          if (nuevo.es_mozo && mode === 'guest') {
            try {
              const anonimoId = await AsyncStorage.getItem('cliente_anonimo_id');
              if (anonimoId) {
                const { data: espera } = await supabase
                  .from('lista_espera')
                  .select('mesa_id')
                  .eq('identificador', anonimoId)
                  .in('estado', ['esperando', 'asignado'])
                  .maybeSingle();

                if (espera?.mesa_id === nuevo.mesa_id) {
                  await dispararNotificacionLocal('Nuevo mensaje del mozo', nuevo.texto || 'Tienes un mensaje del mozo.', {
                    ruta: '/cliente/chat',
                    evento: 'chat_cliente',
                  });
                }
              }
            } catch (err) {
              console.log('Error al notificar mensaje de chat al cliente anónimo:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [autenticado, usuario, mode]);

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
