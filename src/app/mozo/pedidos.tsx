import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { supabase } from '../../../lib/supabase';
import { PrimaryButton } from '../../components/ui/Buttons';
import { useAppSession } from '../../contexts/AppSessionContext';
import { getPedidosMozo, actualizarEstadoPedido } from '../../services/pedidos.service';

const ESTADOS = ['todos', 'pendiente_mozo', 'confirmado', 'en_preparacion', 'entregado', 'rechazado'];

const ITEM_HEIGHT = 180;
const ITEM_MARGIN = 16;

export default function PedidosMozo() {
  const router = useRouter();
  const { usuario, role } = useAppSession();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('todos');

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
    try {
      const data = await getPedidosMozo();
      if (data) setPedidos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await actualizarEstadoPedido(id, nuevoEstado);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el pedido.');
    }
  };

  const getStatusBgColor = (estado: string) => {
    switch (estado) {
      case 'pendiente_mozo': return 'bg-chido-aviso text-chido-texto-sobre-oscuro';
      case 'confirmado': return 'bg-chido-exito text-chido-texto-sobre-oscuro';
      case 'en_preparacion': return 'bg-chido-botonPrincipal text-chido-texto-sobre-oscuro';
      case 'entregado': return 'bg-chido-superficieTerracota text-white';
      case 'rechazado': return 'bg-chido-error text-chido-texto-sobre-oscuro';
      default: return 'bg-chido-superficieTerracota text-white';
    }
  };

  const pedidosFiltrados = pedidos.filter(p => filtro === 'todos' || p.estado === filtro);

  const userName = usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Mozo";
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Mozo";

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={userName} role={`${displayRole} - Pedidos`} />

      <View className="py-4 bg-chido-fondo">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {ESTADOS.map(est => (
            <TouchableOpacity
              key={est}
              onPress={() => setFiltro(est)}
              className={`px-4 py-2 rounded-full border-2 border-white/70 ${filtro === est ? 'bg-chido-acento' : 'bg-chido-cabecera'}`}
            >
              <Text className="text-chido-texto-sobre-oscuro font-bold capitalize">
                {est.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={pedidosFiltrados}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={ITEM_HEIGHT + ITEM_MARGIN}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text className="text-chido-texto-sobre-oscuro text-center mt-10 text-lg">No hay pedidos.</Text>}
          renderItem={({ item }) => {
            const bgClass = getStatusBgColor(item.estado).split(' ')[0];
            const textClass = getStatusBgColor(item.estado).split(' ')[1];
            return (
            <View 
              className="p-5 bg-chido-cabecera border-2 border-white/70 rounded-2xl flex-col"
              style={{ height: ITEM_HEIGHT, marginBottom: ITEM_MARGIN }}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold" numberOfLines={1}>
                    Mesa {item.mesas?.numero}
                  </Text>
                  <Text className="text-white text-lg capitalize mt-2 font-semibold">
                    {item.mesas?.tipo} • {item.mesas?.cantidad_comensales} personas
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-chido-texto-sobre-oscuro font-extrabold text-2xl mb-2">${item.total}</Text>
                  <View className={`px-3 py-1 rounded-full border border-white/40 ${bgClass}`}>
                    <Text className={`font-bold text-xs ${textClass}`}>
                      {item.estado.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View className="mt-auto pt-3 flex-row justify-end items-center gap-3">
                {item.estado === 'pendiente_mozo' && (
                  <>
                    <TouchableOpacity 
                      className="bg-chido-exito border-2 border-white/70 px-4 py-3 rounded-xl flex-1 items-center"
                      onPress={() => cambiarEstado(item.id, 'confirmado')}
                    >
                      <Text className="text-chido-texto-sobre-oscuro font-bold text-base">Aceptar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="bg-chido-error border-2 border-white/70 px-4 py-3 rounded-xl flex-1 items-center"
                      onPress={() => cambiarEstado(item.id, 'rechazado')}
                    >
                      <Text className="text-chido-texto-sobre-oscuro font-bold text-base">Rechazar</Text>
                    </TouchableOpacity>
                  </>
                )}
                {item.estado === 'confirmado' && (
                  <TouchableOpacity 
                    className="bg-chido-botonPrincipal border-2 border-white/70 px-6 py-3 rounded-xl w-full items-center"
                    onPress={() => cambiarEstado(item.id, 'entregado')}
                  >
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-base">Marcar como Entregado</Text>
                  </TouchableOpacity>
                )}
                
                {/* Textos de tiempo para los estados sin botones */}
                {(item.estado === 'en_preparacion' || item.estado === 'entregado' || item.estado === 'rechazado') && (
                  <View className="flex-1 items-center justify-center py-2">
                    <Text className="text-chido-texto-secundario-sobre-oscuro font-semibold text-base text-center">
                      {item.estado === 'en_preparacion' && `En cocina - Ingresado a las ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      {item.estado === 'entregado' && `Finalizado - Pedido de las ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      {item.estado === 'rechazado' && `Cancelado - Pedido de las ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}}
        />
      )}
    </View>
  );
}

