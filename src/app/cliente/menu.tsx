import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/ui/Buttons';
import { Producto } from '../../types/producto';
import { getProductos } from '../../services/productos.service';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 440;
const ITEM_MARGIN = 24;

export default function MenuCliente() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [pedido, setPedido] = useState<Record<string, number>>({});
  
  const [filtro, setFiltro] = useState<'todos' | 'plato' | 'bebida'>('todos');

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (err: any) {
      console.log('Error fetching productos:', err);
      Alert.alert('Error', 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  };

  const updateCantidad = (id: string, delta: number) => {
    setPedido(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const newPedido = { ...prev };
      if (next === 0) {
        delete newPedido[id];
      } else {
        newPedido[id] = next;
      }
      return newPedido;
    });
  };

  const totalImporte = Object.entries(pedido).reduce((acc, [id, cant]) => {
    const prod = productos.find(p => p.id === id);
    return acc + (prod ? prod.precio * cant : 0);
  }, 0);

  const tiempoEstimado = Object.entries(pedido).reduce((acc, [id, cant]) => {
    const prod = productos.find(p => p.id === id);
    return acc + (prod && cant > 0 ? prod.tiempo_elaboracion : 0);
  }, 0);

  const handleRealizarPedido = async () => {
    if (Object.keys(pedido).length === 0) {
      Alert.alert('Aviso', 'Agrega productos al pedido.');
      return;
    }
    
    try {
      const mockClienteId = "00000000-0000-0000-0000-000000000000";
      const mockMesaId = "00000000-0000-0000-0000-000000000000"; 
      
      Alert.alert(
        'Confirmar pedido',
        `El total es $${totalImporte} y tardará aprox ${tiempoEstimado} min.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Pedir', 
            onPress: async () => {
              Alert.alert('Pedido realizado', 'Esperando confirmación del mozo...');
              setPedido({});
            }
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo realizar el pedido');
    }
  };

  const renderCarousel = (fotos: string[]) => {
    if (!fotos || fotos.length === 0) {
      return (
        <View className="w-full h-48 bg-[#9c5120] rounded-xl items-center justify-center">
          <Ionicons name="fast-food-outline" size={40} color="#e2b99f" />
        </View>
      );
    }
    
    return (
      <FlatList
        data={fotos}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={width - 80 + 16} // width - 80 (image) + 16 (mr-4)
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <Image 
            source={{ uri: item }} 
            style={{ width: width - 80, height: 192 }}
            className="rounded-xl mr-4"
            resizeMode="cover"
          />
        )}
      />
    );
  };

  const productosFiltrados = productos.filter(p => {
    if (filtro === 'todos') return true;
    return p.tipo === filtro;
  });

  return (
    <View className="flex-1 bg-[#d97736]">
      <Header userName="Cliente" role="Mesa 4" />
      
      <View className="flex-row items-center p-4 bg-[#b35e25]">
        <Text className="text-2xl font-bold text-white mr-auto">Menú</Text>
        <TouchableOpacity 
          className="flex-row items-center bg-[#9c5120] px-4 py-2 rounded-full"
          onPress={() => router.push('/cliente/chat')}
        >
          <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
          <Text className="text-white font-bold ml-2">Consultar al mozo</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row p-5 gap-2">
        <TouchableOpacity 
          className={`px-4 py-2 rounded-full border-2 ${filtro === 'todos' ? 'bg-[#e2b99f] border-[#e2b99f]' : 'bg-transparent border-[#e2b99f]'}`}
          onPress={() => setFiltro('todos')}
        >
          <Text className={`font-bold ${filtro === 'todos' ? 'text-[#9c5120]' : 'text-[#e2b99f]'}`}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`px-4 py-2 rounded-full border-2 ${filtro === 'plato' ? 'bg-[#e2b99f] border-[#e2b99f]' : 'bg-transparent border-[#e2b99f]'}`}
          onPress={() => setFiltro('plato')}
        >
          <Text className={`font-bold ${filtro === 'plato' ? 'text-[#9c5120]' : 'text-[#e2b99f]'}`}>Platos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`px-4 py-2 rounded-full border-2 ${filtro === 'bebida' ? 'bg-[#e2b99f] border-[#e2b99f]' : 'bg-transparent border-[#e2b99f]'}`}
          onPress={() => setFiltro('bebida')}
        >
          <Text className={`font-bold ${filtro === 'bebida' ? 'text-[#9c5120]' : 'text-[#e2b99f]'}`}>Bebidas</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : productosFiltrados.length === 0 ? (
        <View className="flex-1 px-5">
          <Text className="text-white text-center text-lg mt-10">No hay productos en esta categoría.</Text>
        </View>
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={ITEM_HEIGHT + ITEM_MARGIN}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: prod }) => {
            const cant = pedido[prod.id] || 0;
            return (
              <View 
                className="bg-[#b35e25] p-4 rounded-2xl"
                style={{ height: ITEM_HEIGHT, marginBottom: ITEM_MARGIN }}
              >
                <Text className="text-xl font-bold text-white mb-2" numberOfLines={1}>{prod.nombre}</Text>
                
                <View className="mb-4">
                  {renderCarousel(prod.fotos)}
                </View>
                
                <Text className="text-white/90 text-sm mb-2 flex-1" numberOfLines={2}>{prod.descripcion}</Text>
                
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-[#e2b99f] font-bold text-lg">${prod.precio}</Text>
                  <Text className="text-[#e2b99f]"><Ionicons name="time-outline" size={16} /> {prod.tiempo_elaboracion} min</Text>
                </View>

                <View className="flex-row items-center justify-center gap-6 mt-auto">
                  <TouchableOpacity 
                    className="w-12 h-12 bg-[#9c5120] rounded-full items-center justify-center"
                    onPress={() => updateCantidad(prod.id, -1)}
                  >
                    <Ionicons name="remove" size={28} color="#fff" />
                  </TouchableOpacity>
                  
                  <Text className="text-white text-2xl font-bold w-8 text-center">{cant}</Text>
                  
                  <TouchableOpacity 
                    className="w-12 h-12 bg-[#9c5120] rounded-full items-center justify-center"
                    onPress={() => updateCantidad(prod.id, 1)}
                  >
                    <Ionicons name="add" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <View className="p-5 bg-[#9c5120] rounded-t-3xl shadow-lg border-t border-[#b35e25]">
        <View className="flex-row justify-between mb-2">
          <Text className="text-white text-lg">Tiempo est. total:</Text>
          <Text className="text-white text-lg font-bold">{tiempoEstimado} min</Text>
        </View>
        <View className="flex-row justify-between mb-4">
          <Text className="text-white text-2xl font-bold">Total a pagar:</Text>
          <Text className="text-white text-2xl font-bold">${totalImporte}</Text>
        </View>
        <PrimaryButton 
          title={Object.keys(pedido).length > 0 ? "Realizar pedido" : "Seleccione un producto"}
          onPress={Object.keys(pedido).length > 0 ? handleRealizarPedido : undefined}
          disabled={Object.keys(pedido).length === 0}
        />
      </View>
    </View>
  );
}

