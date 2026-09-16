import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { supabase } from '../../../lib/supabase';
import { PrimaryButton } from '../../components/ui/Buttons';

export default function PedidosMozo() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPedidos();
    const channel = supabase
      .channel('pedidos_mozo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        cargarPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cargarPedidos = async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, mesas(numero), usuarios(nombres, apellidos)')
      .order('created_at', { ascending: false });
      
    if (data) setPedidos(data);
    setLoading(false);
  };

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id);
    if (error) Alert.alert('Error', 'No se pudo actualizar el pedido.');
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente_mozo': return 'text-orange-300';
      case 'confirmado': return 'text-green-300';
      case 'en_preparacion': return 'text-blue-300';
      case 'entregado': return 'text-white';
      case 'rechazado': return 'text-red-300';
      default: return 'text-white';
    }
  };

  return (
    <View className="flex-1 bg-[#d97736]">
      <Header userName="Mozo" role="Gestión de Pedidos" />
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={pedidos}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View className="p-4 bg-[#b35e25] mb-4 rounded-xl">
              <Text className="text-white text-xl font-bold mb-1">
                Mesa {item.mesas?.numero} - {item.usuarios?.nombres}
              </Text>
              <Text className="text-white font-bold mb-2 text-lg">${item.total}</Text>
              <Text className={`font-bold mb-4 ${getStatusColor(item.estado)}`}>
                Estado: {item.estado.replace('_', ' ').toUpperCase()}
              </Text>

              {item.estado === 'pendiente_mozo' && (
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity 
                    className="flex-1 bg-green-600 p-3 rounded-xl items-center"
                    onPress={() => cambiarEstado(item.id, 'confirmado')}
                  >
                    <Text className="text-white font-bold text-base">Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="flex-1 bg-red-600 p-3 rounded-xl items-center"
                    onPress={() => cambiarEstado(item.id, 'rechazado')}
                  >
                    <Text className="text-white font-bold text-base">Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {item.estado === 'confirmado' && (
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity 
                    className="flex-1 bg-blue-600 p-3 rounded-xl items-center"
                    onPress={() => cambiarEstado(item.id, 'entregado')}
                  >
                    <Text className="text-white font-bold text-base">Marcar Entregado</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

