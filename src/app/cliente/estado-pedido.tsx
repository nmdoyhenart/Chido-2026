import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { getEstadoPedido, getEstadoPedidoAnonimo, suscribirEstadoPedido, confirmarRecepcionPedido, solicitarCuentaPedido } from '../../services/pedidos.service';
import { colores } from '../../theme/colores';

const textosEstado: Record<string, string> = {
  pendiente_mozo: 'Esperando confirmación del mozo.',
  confirmado: 'Pedido confirmado. En preparación.',
  en_preparacion: 'Cocina y bar están preparando tu pedido.',
  entregado: 'El mozo indicó que ya entregó el pedido. Confirmá cuando lo tengas.',
  recibido: '¡Recepción confirmada! Ya podés disfrutar tu pedido.',
  rechazado: 'El mozo rechazó el pedido. Podés cambiar productos o cantidades y volver a enviarlo.',
};

export default function EstadoPedido() {
  const router = useRouter();
  const { pedidoId, clienteAnonimoId } = useLocalSearchParams<{ pedidoId: string; clienteAnonimoId?: string }>();
  const [estado, setEstado] = useState<string>('pendiente_mozo');
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [cuentaSolicitada, setCuentaSolicitada] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pedidoId) return;
    let activo = true;
    const fetchEstado = async () => {
      try {
        const estadoActual = clienteAnonimoId
          ? await getEstadoPedidoAnonimo(clienteAnonimoId, pedidoId)
          : await getEstadoPedido(pedidoId);
        if (activo) setEstado(estadoActual);
      } catch (caught) {
        if (activo) console.error('No se pudo consultar el estado del pedido:', caught);
      }
    };
    void fetchEstado();
    const intervalo = setInterval(() => { void fetchEstado(); }, 5000);
    const desuscribir = clienteAnonimoId ? () => {} : suscribirEstadoPedido(pedidoId, setEstado);
    return () => { activo = false; clearInterval(intervalo); desuscribir(); };
  }, [pedidoId, clienteAnonimoId]);

  const confirmarRecepcion = async () => {
    if (!pedidoId || cargandoAccion) return;
    setCargandoAccion(true);
    setError('');
    try {
      await confirmarRecepcionPedido(pedidoId, clienteAnonimoId);
      setEstado('recibido');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo confirmar la recepción.');
    } finally {
      setCargandoAccion(false);
    }
  };

  const pedirCuenta = async () => {
    if (!pedidoId || cargandoAccion) return;
    setCargandoAccion(true);
    setError('');
    try {
      await solicitarCuentaPedido(pedidoId, clienteAnonimoId);
      setCuentaSolicitada(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo solicitar la cuenta.');
    } finally {
      setCargandoAccion(false);
    }
  };

  const volverAModificar = () => router.replace({
    pathname: '/cliente/menu',
    params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) },
  });

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role="Tu Pedido" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
        <View className="items-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-6">
          <Ionicons
            name={estado === 'recibido' ? 'checkmark-circle-outline' : estado === 'entregado' ? 'hand-left-outline' : estado === 'pendiente_mozo' ? 'time-outline' : 'restaurant-outline'}
            size={76}
            color={colores.textoSobreOscuro}
          />
          <Text className="mt-5 text-center text-3xl font-extrabold text-chido-texto-sobre-oscuro">
            {estado === 'entregado' ? '¿Recibiste tu pedido?' : estado === 'recibido' ? '¡Que lo disfrutes!' : 'Estado del pedido'}
          </Text>
          <Text className="mt-3 text-center text-lg font-semibold text-chido-texto-secundario-sobre-oscuro">
            {textosEstado[estado] ?? `Estado actual: ${estado.replaceAll('_', ' ')}`}
          </Text>

          {!!error && <Text accessibilityLiveRegion="assertive" className="mt-4 text-center font-semibold text-chido-texto-sobre-oscuro">{error}</Text>}

          {estado === 'entregado' && (
            <TouchableOpacity accessibilityRole="button" disabled={cargandoAccion} onPress={confirmarRecepcion} className="mt-6 w-full rounded-2xl border-2 border-white/70 bg-chido-botonPrincipal p-4">
              {cargandoAccion ? <ActivityIndicator color={colores.textoSobreOscuro} /> : <Text className="text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">Confirmar recepción</Text>}
            </TouchableOpacity>
          )}

          {estado === 'rechazado' && (
            <TouchableOpacity accessibilityRole="button" onPress={volverAModificar} className="mt-6 w-full rounded-2xl border-2 border-white/70 bg-chido-botonPrincipal p-4">
              <Text className="text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">Modificar pedido</Text>
            </TouchableOpacity>
          )}

          {estado === 'recibido' && (
            <View className="mt-6 w-full gap-3">
              <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/juegos' as Href)} className="flex-row items-center justify-center rounded-2xl border-2 border-white/70 bg-chido-botonPrincipal p-4">
                <Ionicons name="game-controller-outline" size={24} color={colores.textoSobreOscuro} />
                <Text className="ml-2 text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">Ir a los juegos</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: '/encuestas/responder', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } } as unknown as Href)} className="flex-row items-center justify-center rounded-2xl border-2 border-white/70 bg-chido-botonPrincipal p-4">
                <Ionicons name="clipboard-outline" size={24} color={colores.textoSobreOscuro} />
                <Text className="ml-2 text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">Completar encuesta</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={cargandoAccion || cuentaSolicitada} onPress={pedirCuenta} className="flex-row items-center justify-center rounded-2xl border-2 border-white/70 bg-chido-acento p-4">
                {cargandoAccion ? <ActivityIndicator color={colores.textoSobreOscuro} /> : <>
                  <Ionicons name={cuentaSolicitada ? 'checkmark-circle-outline' : 'receipt-outline'} size={24} color={colores.textoSobreOscuro} />
                  <Text className="ml-2 text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">{cuentaSolicitada ? 'Cuenta solicitada al mozo' : 'Pedir la cuenta'}</Text>
                </>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
