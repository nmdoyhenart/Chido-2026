import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { getEstadoPedido, suscribirEstadoPedido } from '../../services/pedidos.service';
import { colores } from '../../theme/colores';

export default function EstadoPedido() {
  const router = useRouter();
  const { pedidoId } = useLocalSearchParams<{ pedidoId: string }>();
  const [estado, setEstado] = useState<string>('pendiente_mozo');

  useEffect(() => {
    if (!pedidoId) return;

    const fetchEstado = async () => {
      try {
        const estadoActual = await getEstadoPedido(pedidoId);
        setEstado(estadoActual);
      } catch (e) {
        console.error(e);
      }
    };
    void fetchEstado();
    // Realtime puede tardar en conectarse en una red móvil; el sondeo mantiene
    // el estado actualizado también cuando la app está en iOS/Expo Go.
    const intervalo = setInterval(() => { void fetchEstado(); }, 5000);

    const desuscribir = suscribirEstadoPedido(pedidoId, (nuevoEstado) => {
      setEstado(nuevoEstado);
      Alert.alert('Pedido Actualizado', `El estado de tu pedido cambió a: ${nuevoEstado}`);
    });

    return () => {
      clearInterval(intervalo);
      desuscribir();
    };
  }, [pedidoId]);

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
          {estado === 'rechazado' && 'El mozo rechazó el pedido. Podés cambiar productos o cantidades y volver a enviarlo.'}
        </Text>

        {(estado === 'entregado' || estado === 'rechazado') && (
          <TouchableOpacity 
            className="bg-chido-cabecera p-4 rounded-xl mt-10 w-full"
            onPress={() => router.replace(estado === 'rechazado'
              ? { pathname: '/cliente/menu', params: { pedidoId } }
              : '/cliente/home')}
          >
            <Text className="text-chido-texto-sobre-oscuro text-center font-bold text-lg">{estado === 'rechazado' ? 'Modificar pedido' : 'Volver al Menú'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
