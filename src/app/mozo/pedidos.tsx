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

  const getStatusBgColor = (estado: string) => {
    switch (estado) {
      case 'pendiente_mozo': return 'bg-chido-aviso';
      case 'confirmado': return 'bg-chido-exito';
      case 'en_preparacion': return 'bg-chido-botonPrincipal';
      case 'entregado': return 'bg-chido-superficieTerracota';
      case 'rechazado': return 'bg-chido-error';
      default: return 'bg-chido-superficieTerracota';
    }
  };

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Mozo" role="Gestión de Pedidos" />
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={pedidos}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View className="p-4 bg-chido-cabecera border-2 border-white/70 mb-4 rounded-2xl">
              <Text className="text-chido-texto-sobre-oscuro text-xl font-bold mb-1">
                Mesa {item.mesas?.numero} - {item.usuarios?.nombres}
              </Text>
              <Text className="text-chido-texto-sobre-oscuro font-bold mb-2 text-lg">${item.total}</Text>
              
              <View className={`mb-4 ${getStatusBgColor(item.estado)} px-3 py-1.5 rounded-full self-start border border-white/40`}>
                <Text className="font-bold text-white text-sm">
                  Estado: {item.estado.replace('_', ' ').toUpperCase()}
                </Text>
              </View>

              {item.estado === 'pendiente_mozo' && (
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity 
                    className="flex-1 bg-chido-exito border-2 border-white/70 p-4 rounded-2xl items-center"
                    onPress={() => cambiarEstado(item.id, 'confirmado')}
                  >
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-base">Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="flex-1 bg-chido-error border-2 border-white/70 p-4 rounded-2xl items-center"
                    onPress={() => cambiarEstado(item.id, 'rechazado')}
                  >
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-base">Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {item.estado === 'confirmado' && (
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity 
                    className="flex-1 bg-chido-botonPrincipal border-2 border-white/70 p-4 rounded-2xl items-center"
                    onPress={() => cambiarEstado(item.id, 'entregado')}
                  >
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-base">Marcar Entregado</Text>
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

