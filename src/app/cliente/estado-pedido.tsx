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
    fetchEstado();

    const desuscribir = suscribirEstadoPedido(pedidoId, (nuevoEstado) => {
      setEstado(nuevoEstado);
      Alert.alert('Pedido Actualizado', `El estado de tu pedido cambió a: ${nuevoEstado}`);
    });

    return desuscribir;
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
          {estado === 'entregado' && '¡Tu pedido ha sido entregado! ¡Que lo disfrutes!'}
          {estado === 'rechazado' && 'Tu pedido ha sido rechazado. Por favor, realiza uno nuevo o consulta al mozo.'}
        </Text>

        {(estado === 'entregado' || estado === 'rechazado') && (
          <TouchableOpacity 
            className="bg-chido-cabecera p-4 rounded-xl mt-10 w-full"
            onPress={() => router.replace('/cliente/home')}
          >
            <Text className="text-chido-texto-sobre-oscuro text-center font-bold text-lg">Volver al Menú</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
