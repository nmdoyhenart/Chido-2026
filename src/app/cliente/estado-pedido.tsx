import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { confirmarRecepcionPedido, getEstadoPedido, getEstadoPedidoAnonimo, solicitarCuentaPedido, suscribirEstadoPedido } from '../../services/pedidos.service';
import { colores } from '../../theme/colores';

export default function EstadoPedido() {
  const router = useRouter();
  const { pedidoId, clienteAnonimoId } = useLocalSearchParams<{ pedidoId: string; clienteAnonimoId?: string }>();
  const [estado, setEstado] = useState<string>('pendiente_mozo');
  const [accionando, setAccionando] = useState(false);
  const [cuentaSolicitada, setCuentaSolicitada] = useState(false);

  useEffect(() => {
    if (!pedidoId) return;

    const fetchEstado = async () => {
      try {
        const estadoActual = clienteAnonimoId
          ? await getEstadoPedidoAnonimo(clienteAnonimoId, pedidoId)
          : await getEstadoPedido(pedidoId);
        setEstado(estadoActual);
      } catch (e) {
        console.error(e);
      }
    };
    void fetchEstado();
    // Realtime puede tardar en conectarse en una red móvil; el sondeo mantiene
    // el estado actualizado también cuando la app está en iOS/Expo Go.
    const intervalo = setInterval(() => { void fetchEstado(); }, 5000);

    const desuscribir = clienteAnonimoId ? () => {} : suscribirEstadoPedido(pedidoId, (nuevoEstado) => {
      setEstado(nuevoEstado);
      Alert.alert('Pedido Actualizado', `El estado de tu pedido cambió a: ${nuevoEstado}`);
    });

    return () => {
      clearInterval(intervalo);
      desuscribir();
    };
  }, [pedidoId, clienteAnonimoId]);

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role="Tu Pedido" />
      
      <View className="flex-1 p-5 items-center justify-center">
        <Ionicons 
          name={estado === 'pendiente_mozo' ? "time-outline" : "restaurant-outline"} 
          size={80} 
          color={colores.textoSobreOscuro} 
        />
        
        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro mt-6 mb-2 text-center">
          Estado del Pedido
        </Text>
        
        <Text className="text-xl text-chido-texto-secundario-sobre-oscuro font-bold mt-4 text-center">
          {estado === 'pendiente_mozo' && 'Esperando confirmación del mozo...'}
          {estado === 'confirmado' && '¡Pedido confirmado! En preparación...'}
          {estado === 'en_preparacion' && 'Cocina y bar están preparando tu pedido.'}
          {estado === 'entregado' && '¡Tu pedido ha sido entregado! ¡Que lo disfrutes!'}
          {estado === 'recibido' && 'Confirmaste la recepción de tu pedido. ¡Que lo disfrutes!'}
          {estado === 'rechazado' && 'El mozo rechazó el pedido. Podés cambiar productos o cantidades y volver a enviarlo.'}
        </Text>

        {estado === 'entregado' && (
          <TouchableOpacity
            accessibilityRole="button"
            disabled={accionando}
            className="bg-chido-cabecera p-4 rounded-xl mt-10 w-full"
            onPress={async () => {
              setAccionando(true);
              try {
                await confirmarRecepcionPedido(pedidoId, clienteAnonimoId);
                setEstado('recibido');
              } catch (error) {
                Alert.alert('No se pudo confirmar', error instanceof Error ? error.message : 'Intentá nuevamente.');
              } finally { setAccionando(false); }
            }}
          >
            <Text className="text-chido-texto-sobre-oscuro text-center font-bold text-lg">{accionando ? 'Confirmando…' : 'Confirmar recepción'}</Text>
          </TouchableOpacity>
        )}

        {estado === 'recibido' && (
          <View className="w-full mt-8 gap-3">
            <Text className="text-chido-texto-sobre-oscuro text-center font-bold text-xl mb-1">¿Qué querés hacer ahora?</Text>
            <TouchableOpacity className="bg-chido-cabecera p-4 rounded-xl" onPress={() => router.push('/encuestas/previas')}>
              <Text className="text-chido-texto-sobre-oscuro text-center font-bold text-lg">Ver encuestas anteriores</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={accionando || cuentaSolicitada}
              className="bg-chido-cabecera p-4 rounded-xl"
              onPress={async () => {
                setAccionando(true);
                try {
                  await solicitarCuentaPedido(pedidoId, clienteAnonimoId);
                  setCuentaSolicitada(true);
                  Alert.alert('Cuenta solicitada', 'El mozo ya puede ver tu solicitud.');
                } catch (error) {
                  Alert.alert('No se pudo solicitar la cuenta', error instanceof Error ? error.message : 'Intentá nuevamente.');
                } finally { setAccionando(false); }
              }}
            >
              <Text className="text-chido-texto-sobre-oscuro text-center font-bold text-lg">{cuentaSolicitada ? 'Cuenta solicitada' : 'Pedir la cuenta'}</Text>
            </TouchableOpacity>
            <Text className="text-chido-texto-secundario-sobre-oscuro text-center">Los juegos todavía no están disponibles en la aplicación.</Text>
          </View>
        )}

        {estado === 'rechazado' && (
          <TouchableOpacity 
            className="bg-chido-cabecera p-4 rounded-xl mt-10 w-full"
            onPress={() => router.replace({ pathname: '/cliente/menu', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } })}
          >
            <Text className="text-chido-texto-sobre-oscuro text-center font-bold text-lg">Modificar pedido</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
