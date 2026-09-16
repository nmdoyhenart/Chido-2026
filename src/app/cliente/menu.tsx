import { useAppSession } from '../../contexts/AppSessionContext';
import { useRestriccionSimulacion } from '../../components/ui/RestriccionSimulacion';
import { productosDemostracion } from '../../data/demostracion';
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSession } from '../../contexts/AppSessionContext';
import { supabase } from '../../../lib/supabase';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/ui/Buttons';
import { Producto } from '../../types/producto';
import { getProductos } from '../../services/productos.service';
import { crearPedido } from '../../services/pedidos.service';
import { colores } from '../../theme/colores';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 440;
const ITEM_MARGIN = 24;

export default function MenuCliente() {
  const router = useRouter();
  const { mesaId } = useLocalSearchParams<{ mesaId: string }>();
  const { usuario } = useAppSession();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesaNumero, setMesaNumero] = useState<number | null>(null);
  
  const [pedido, setPedido] = useState<Record<string, number>>({});
  
  const [filtro, setFiltro] = useState<'todos' | 'plato' | 'bebida'>('todos');

  useEffect(() => {
    cargarProductos();
    if (mesaId) {
      supabase.from('mesas').select('numero').eq('id', mesaId).single().then(({ data }) => {
        if (data) setMesaNumero(data.numero);
      });
    }
  }, [mesaId]);

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
    void cargar();
    return () => { activo = false; };
  }, [mode]);


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
    if (bloquear('realizar pedidos')) return;
    if (Object.keys(pedido).length === 0) {
      Alert.alert('Aviso', 'Agrega productos al pedido.');
      return;
    }
    if (!usuario?.id || !mesaId) {
      Alert.alert('Error', 'Falta información del cliente o la mesa.');
      return;
    }
    
    try {
      Alert.alert(
        'Confirmar pedido',
        `El total es $${totalImporte} y tardará aprox ${tiempoEstimado} min.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Pedir', 
            onPress: async () => {
              try {
                const detalles = Object.entries(pedido).map(([id, cant]) => ({
                  producto_id: id,
                  cantidad: cant,
                  precio_unitario: productos.find(p => p.id === id)?.precio || 0
                }));
                
                const nuevoPedidoId = await crearPedido(usuario.id, mesaId, totalImporte, detalles);
                
                Alert.alert('Pedido realizado', 'Esperando confirmación del mozo...');
                setPedido({});
                router.push({ pathname: '/cliente/estado-pedido', params: { pedidoId: nuevoPedidoId } });
              } catch (e: any) {
                console.error(e);
                Alert.alert('Error', `No se pudo generar el pedido: ${e.message || JSON.stringify(e)}`);
              }
            }
          }
        ]
      );
    } catch {
      Alert.alert('Error', 'No se pudo realizar el pedido');
    }
  };

  const renderCarousel = (fotos: string[]) => {
    if (!fotos || fotos.length === 0) {
      return (
        <View className="w-full h-48 bg-chido-cabecera rounded-xl items-center justify-center">
          <Ionicons name="fast-food-outline" size={40} color={colores.textoSecundarioSobreOscuro} />
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
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role={mesaNumero ? `Mesa ${mesaNumero}` : "Mesa"} />
      
      <View className="flex-row items-center p-4 bg-chido-acento">
        <Text className="text-2xl font-bold text-chido-texto-sobre-oscuro mr-auto">Menú</Text>
        <TouchableOpacity 
          className="flex-row items-center bg-chido-oscuro px-4 py-2 rounded-full"
          onPress={() => router.push({ pathname: '/cliente/chat', params: { mesaId, numero: mesaNumero } })}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={colores.textoSobreOscuro} />
          <Text className="text-chido-texto-sobre-oscuro font-bold ml-2">Consultar al mozo</Text>
        </TouchableOpacity>}
      </View>

      <View className="flex-row p-5 gap-2">
        <TouchableOpacity
          className={`px-4 py-2 rounded-full border-2 ${filtro === 'todos' ? 'bg-chido-texto-secundario-sobre-oscuro border-chido-texto-secundario-sobre-oscuro' : 'bg-transparent border-chido-texto-secundario-sobre-oscuro'}`}
          onPress={() => setFiltro('todos')}
        >
          <Text className={`font-bold ${filtro === 'todos' ? 'text-chido-cabecera' : 'text-chido-texto-secundario-sobre-oscuro'}`}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-4 py-2 rounded-full border-2 ${filtro === 'plato' ? 'bg-chido-texto-secundario-sobre-oscuro border-chido-texto-secundario-sobre-oscuro' : 'bg-transparent border-chido-texto-secundario-sobre-oscuro'}`}
          onPress={() => setFiltro('plato')}
        >
          <Text className={`font-bold ${filtro === 'plato' ? 'text-chido-cabecera' : 'text-chido-texto-secundario-sobre-oscuro'}`}>Platos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-4 py-2 rounded-full border-2 ${filtro === 'bebida' ? 'bg-chido-texto-secundario-sobre-oscuro border-chido-texto-secundario-sobre-oscuro' : 'bg-transparent border-chido-texto-secundario-sobre-oscuro'}`}
          onPress={() => setFiltro('bebida')}
        >
          <Text className={`font-bold ${filtro === 'bebida' ? 'text-chido-cabecera' : 'text-chido-texto-secundario-sobre-oscuro'}`}>Bebidas</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colores.textoSobreOscuro} />
        </View>
      ) : productosFiltrados.length === 0 ? (
        <View className="flex-1 px-5">
          <Text className="text-chido-texto-sobre-oscuro text-center text-lg mt-10">No hay productos en esta categoría.</Text>
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
                className="bg-chido-acento p-4 rounded-2xl"
                style={{ height: ITEM_HEIGHT, marginBottom: ITEM_MARGIN }}
              >
                <Text className="text-xl font-bold text-chido-texto-sobre-oscuro mb-2" numberOfLines={1}>{prod.nombre}</Text>

                <View className="mb-4">
                  {renderCarousel(prod.fotos)}
                </View>

                <Text className="text-chido-texto-sobre-oscuro/90 text-sm mb-2 flex-1" numberOfLines={2}>{prod.descripcion}</Text>

                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-chido-texto-secundario-sobre-oscuro font-bold text-lg">${prod.precio}</Text>
                  <Text className="text-chido-texto-secundario-sobre-oscuro"><Ionicons name="time-outline" size={16} /> {prod.tiempo_elaboracion} min</Text>
                </View>

                {!administracion && <View className="flex-row items-center justify-center gap-6 mt-auto">
                  <TouchableOpacity
                    className="w-12 h-12 bg-chido-cabecera rounded-full items-center justify-center"
                    onPress={() => updateCantidad(prod.id, -1)}
                  >
                    <Ionicons name="remove" size={28} color={colores.textoSobreOscuro} />
                  </TouchableOpacity>

                  <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold w-8 text-center">{cant}</Text>

                  <TouchableOpacity
                    className="w-12 h-12 bg-chido-cabecera rounded-full items-center justify-center"
                    onPress={() => updateCantidad(prod.id, 1)}
                  >
                    <Ionicons name="add" size={28} color={colores.textoSobreOscuro} />
                  </TouchableOpacity>
                </View>}
              </View>
            );
          }}
        />
      )}

      {!administracion && <View className="p-5 bg-chido-cabecera rounded-t-3xl shadow-lg border-t border-chido-acento">
        <View className="flex-row justify-between mb-2">
          <Text className="text-chido-texto-sobre-oscuro text-lg">Tiempo est. total:</Text>
          <Text className="text-chido-texto-sobre-oscuro text-lg font-bold">{tiempoEstimado} min</Text>
        </View>
        <View className="flex-row justify-between mb-4">
          <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold">Total a pagar:</Text>
          <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold">${totalImporte}</Text>
        </View>
        <PrimaryButton 
          title={Object.keys(pedido).length > 0 ? "Realizar pedido" : "Seleccione un producto"}
          onPress={Object.keys(pedido).length > 0 ? handleRealizarPedido : undefined}
          disabled={Object.keys(pedido).length === 0}
        />
      </View>}
    </View>
  );
}

