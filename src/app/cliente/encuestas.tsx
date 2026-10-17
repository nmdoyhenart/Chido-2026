import React, { useCallback, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../../components/Header';
import { useAltoDisponible } from '../../hooks/useAltoDisponible';
import { colores } from '../../theme/colores';
import { verificarEncuesta } from '../../services/encuestas.service';
import { getEstadoPedido, getEstadoPedidoAnonimo } from '../../services/pedidos.service';

export default function EncuestasCliente() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ pedidoId?: string; clienteAnonimoId?: string; estadoPedido?: string }>();
  const pedidoId = Array.isArray(params.pedidoId) ? params.pedidoId[0] : params.pedidoId;
  const clienteAnonimoId = Array.isArray(params.clienteAnonimoId) ? params.clienteAnonimoId[0] : params.clienteAnonimoId;
  const rawEstado = Array.isArray(params.estadoPedido) ? params.estadoPedido[0] : params.estadoPedido;

  const [estadoPedido, setEstadoPedido] = useState<string | null>(() => rawEstado || null);
  const [encuestaCompletada, setEncuestaCompletada] = useState(false);
  const { alMedir, compacto, muyCompacto } = useAltoDisponible();

  const espacio = muyCompacto ? 8 : compacto ? 12 : 16;
  const tarjeta = {
    flexGrow: 1,
    flexBasis: 0,
    justifyContent: 'center' as const,
    paddingHorizontal: compacto ? 16 : 24,
    paddingVertical: muyCompacto ? 8 : compacto ? 12 : 16,
  };
  const tituloTarjeta = muyCompacto
    ? { fontSize: 22, lineHeight: 28 }
    : compacto
    ? { fontSize: 26, lineHeight: 32 }
    : { fontSize: 30, lineHeight: 36 };
  const subtituloTarjeta = muyCompacto
    ? { fontSize: 13, lineHeight: 17 }
    : compacto
    ? { fontSize: 14, lineHeight: 18 }
    : { fontSize: 16, lineHeight: 22 };
  const iconoTarjeta = muyCompacto ? 38 : compacto ? 46 : 54;

  useFocusEffect(
    useCallback(() => {
      if (!pedidoId) return;

      void AsyncStorage.getItem(`encuesta_completada_${pedidoId}`).then((valor) => {
        if (valor === 'true') {
          setEncuestaCompletada(true);
        } else {
          void verificarEncuesta(pedidoId)
            .then(setEncuestaCompletada)
            .catch(() => setEncuestaCompletada(false));
        }
      });

      const consultarEstado = async () => {
        try {
          const estado = clienteAnonimoId
            ? await getEstadoPedidoAnonimo(clienteAnonimoId, pedidoId)
            : await getEstadoPedido(pedidoId);
          setEstadoPedido(estado);
        } catch (e) {
          console.error('Error al consultar estado en encuestas:', e);
        }
      };

      void consultarEstado();
    }, [pedidoId, clienteAnonimoId])
  );

  const pedidoRecibido = Boolean(
    estadoPedido && ['recibido', 'pago_informado', 'finalizado'].includes(estadoPedido)
  );
  const puedeRealizarEncuesta = pedidoRecibido && !encuestaCompletada;

  let tituloEncuesta = 'Realizar nueva encuesta';
  let subtituloEncuesta = 'Calificá la comida, la atención y dejanos tu opinión';
  let iconoEncuesta: 'create-outline' | 'checkmark-circle-outline' | 'lock-closed-outline' = 'create-outline';
  let iconoFinal: 'chevron-forward' | 'checkmark-circle' | 'lock-closed-outline' = 'chevron-forward';

  if (!pedidoRecibido) {
    tituloEncuesta = 'Realizar nueva encuesta';
    subtituloEncuesta = 'Disponible al confirmar la recepción del pedido';
    iconoEncuesta = 'lock-closed-outline';
    iconoFinal = 'lock-closed-outline';
  } else if (encuestaCompletada) {
    tituloEncuesta = 'Encuesta enviada';
    subtituloEncuesta = '¡Gracias! Ya completaste la encuesta de este pedido';
    iconoEncuesta = 'checkmark-circle-outline';
    iconoFinal = 'checkmark-circle';
  }

  return (
    <View className="flex-1 bg-chido-fondo">
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName={clienteAnonimoId ? 'Invitado' : 'Cliente'} role="Encuestas" />

      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        className="flex-1"
        style={{ paddingBottom: Math.max(insets.bottom, espacio) }}
      >
        <View
          className="flex-1"
          onLayout={alMedir}
          style={{
            gap: espacio,
            paddingHorizontal: 16,
            paddingTop: espacio,
          }}
        >
          {/* Botón Volver al pedido */}
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver al pedido"
            className="self-start flex-row items-center rounded-xl bg-chido-acento px-4"
            style={{ minHeight: muyCompacto ? 40 : 48 }}
          >
            <Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} />
            <Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">
              Volver al pedido
            </Text>
          </Pressable>

          {/* Tarjeta de título */}
          <View
            className="rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera px-5"
            style={{ paddingVertical: muyCompacto ? 8 : compacto ? 12 : 16 }}
          >
            <Text
              className="font-extrabold text-chido-texto-sobre-oscuro"
              style={compacto ? { fontSize: 26, lineHeight: 32 } : { fontSize: 32, lineHeight: 38 }}
            >
              Opiniones del restaurante
            </Text>
            <Text className="text-sm font-medium text-chido-texto-secundario-sobre-oscuro mt-1">
              Tu experiencia y la de los demás comensales
            </Text>
          </View>

          {/* Botón 1: Realizar una nueva encuesta */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              !pedidoRecibido
                ? 'Disponible al confirmar la recepción del pedido'
                : encuestaCompletada
                ? 'Encuesta ya completada para este pedido'
                : 'Realizar una nueva encuesta'
            }
            accessibilityState={{ disabled: !puedeRealizarEncuesta }}
            disabled={!puedeRealizarEncuesta}
            className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${
              !puedeRealizarEncuesta ? 'opacity-60' : ''
            }`}
            style={tarjeta}
            onPress={() =>
              router.push({
                pathname: '/cliente/encuesta',
                params: {
                  pedidoId: pedidoId ?? '',
                  ...(clienteAnonimoId ? { clienteAnonimoId } : {}),
                  ...(estadoPedido ? { estadoPedido } : {}),
                },
              })
            }
          >
            <View className="flex-row items-center">
              <Ionicons
                name={iconoEncuesta}
                size={iconoTarjeta}
                color={colores.textoSobreOscuro}
              />
              <View className="ml-4 flex-1">
                <Text
                  className="font-extrabold text-chido-texto-sobre-oscuro"
                  style={tituloTarjeta}
                >
                  {tituloEncuesta}
                </Text>
                <Text
                  className="mt-1 font-bold text-chido-texto-secundario-sobre-oscuro"
                  style={subtituloTarjeta}
                >
                  {subtituloEncuesta}
                </Text>
              </View>
              <Ionicons
                name={iconoFinal}
                size={30}
                color={colores.textoSobreOscuro}
              />
            </View>
          </Pressable>

          {/* Botón 2: Ver las encuestas anteriores */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver las encuestas anteriores"
            className="rounded-2xl border-2 border-white/70 bg-chido-cabecera"
            style={tarjeta}
            onPress={() => router.push('/encuestas/previas')}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="bar-chart-outline"
                size={iconoTarjeta}
                color={colores.textoSobreOscuro}
              />
              <View className="ml-4 flex-1">
                <Text
                  className="font-extrabold text-chido-texto-sobre-oscuro"
                  style={tituloTarjeta}
                >
                  Ver encuestas anteriores
                </Text>
                <Text
                  className="mt-1 font-bold text-chido-texto-secundario-sobre-oscuro"
                  style={subtituloTarjeta}
                >
                  Mirá qué opinan otros clientes y nuestras estadísticas
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
