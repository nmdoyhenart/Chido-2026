import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, FlatList, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSession } from '../../contexts/AppSessionContext';
import { supabase } from '../../../lib/supabase';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/ui/Buttons';
import { Producto } from '../../types/producto';
import { getProductos } from '../../services/productos.service';
import { crearPedido, crearPedidoAnonimo, getPedidoRechazado, getPedidoRechazadoAnonimo } from '../../services/pedidos.service';
import { colores } from '../../theme/colores';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 440;
const ITEM_MARGIN = 24;

export default function MenuCliente() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mesaId: mesaIdParametro, pedidoId, clienteAnonimoId: clienteAnonimoIdParametro } = useLocalSearchParams<{ mesaId?: string; pedidoId?: string; clienteAnonimoId?: string }>();
  const { usuario } = useAppSession();
  const [mesaId, setMesaId] = useState(mesaIdParametro ?? '');
  const [clienteAnonimoId, setClienteAnonimoId] = useState(clienteAnonimoIdParametro ?? '');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesaNumero, setMesaNumero] = useState<number | null>(null);
  
  const [pedido, setPedido] = useState<Record<string, number>>({});
  const [cargandoPedido, setCargandoPedido] = useState(!!pedidoId);
  const [errorCargaPedido, setErrorCargaPedido] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const solicitudId = useRef(Crypto.randomUUID());
  
  const [filtro, setFiltro] = useState<'todos' | 'plato' | 'bebida' | 'postre'>('todos');

  async function cargarProductos() {
    try {
      const data = await getProductos();
      setProductos(data.filter(producto => producto.tipo === 'plato' || producto.tipo === 'bebida' || producto.tipo === 'postre'));
    } catch (err: unknown) {
      console.log('Error fetching productos:', err);
      Alert.alert('Error', 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cargaInicial = setTimeout(() => { void cargarProductos(); }, 0);
    let activo = true;
    const mostrarNumeroMesa = async (id: string) => {
      const { data } = await supabase.from('mesas').select('numero').eq('id', id).single();
      if (activo && data) setMesaNumero(data.numero);
    };
    void AsyncStorage.getItem('cliente_anonimo_id').then(id => {
      if (activo && !clienteAnonimoIdParametro && id) setClienteAnonimoId(id);
    });
    if (pedidoId) {
      void (clienteAnonimoIdParametro
        ? getPedidoRechazadoAnonimo(clienteAnonimoIdParametro, pedidoId)
        : getPedidoRechazado(pedidoId)).then(pedidoAnterior => {
        if (!activo) return;
        setMesaId(pedidoAnterior.mesa_id);
        void mostrarNumeroMesa(pedidoAnterior.mesa_id);
        setPedido(Object.fromEntries(pedidoAnterior.detalles.map(detalle => [detalle.producto_id, detalle.cantidad])));
      }).catch(error => {
        if (activo) setErrorCargaPedido(error instanceof Error ? error.message : 'No se pudo recuperar el pedido.');
      }).finally(() => { if (activo) setCargandoPedido(false); });
    } else {
      if (mesaIdParametro) void mostrarNumeroMesa(mesaIdParametro);
    }
    return () => { activo = false; clearTimeout(cargaInicial); };
  }, [mesaIdParametro, pedidoId, clienteAnonimoIdParametro]);

  const updateCantidad = (id: string, delta: number) => {
    solicitudId.current = Crypto.randomUUID();
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
    return acc + (prod && cant > 0 ? prod.tiempo_elaboracion * cant : 0);
  }, 0);

  const handleRealizarPedido = async () => {
    if (enviandoRef.current) return;
    if (Object.keys(pedido).length === 0) {
      Alert.alert('Aviso', 'Agrega productos al pedido.');
      return;
    }
    if ((!usuario?.id && !clienteAnonimoId) || !mesaId || (pedidoId && !Object.keys(pedido).length)) {
      Alert.alert('Error', 'No encontramos la mesa o el pedido. Escaneá el QR de tu mesa y volvé a intentarlo.');
      return;
    }
    
    try {
      enviandoRef.current = true;
      setEnviando(true);
      const detalles = Object.entries(pedido).map(([id, cantidad]) => ({ producto_id: id, cantidad }));
      const guardado = clienteAnonimoId
        ? await crearPedidoAnonimo(clienteAnonimoId, mesaId, solicitudId.current, detalles, pedidoId)
        : await crearPedido(mesaId, solicitudId.current, detalles, pedidoId);
      router.replace({ pathname: '/cliente/estado-pedido', params: { pedidoId: guardado.pedido_id, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } });
    } catch (error: unknown) {
      Alert.alert('No se pudo enviar el pedido', error instanceof Error ? error.message : 'Intentá nuevamente.');
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
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
      {!!errorCargaPedido && <Text className="bg-chido-error p-3 text-center text-chido-texto-sobre-oscuro">{errorCargaPedido}</Text>}
      
      <View className="flex-row items-center p-4 bg-chido-acento">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          <TouchableOpacity
            className={`px-4 py-2 rounded-full border-2 ${filtro === 'plato' ? 'bg-chido-texto-secundario-sobre-oscuro border-chido-texto-secundario-sobre-oscuro' : 'bg-chido-acento border-chido-texto-secundario-sobre-oscuro'}`}
            onPress={() => setFiltro(filtro === 'plato' ? 'todos' : 'plato')}
          >
            <Text className={`font-bold ${filtro === 'plato' ? 'text-chido-cabecera' : 'text-chido-texto-secundario-sobre-oscuro'}`}>Plato</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 rounded-full border-2 ${filtro === 'postre' ? 'bg-chido-texto-secundario-sobre-oscuro border-chido-texto-secundario-sobre-oscuro' : 'bg-chido-acento border-chido-texto-secundario-sobre-oscuro'}`}
            onPress={() => setFiltro(filtro === 'postre' ? 'todos' : 'postre')}
          >
            <Text className={`font-bold ${filtro === 'postre' ? 'text-chido-cabecera' : 'text-chido-texto-secundario-sobre-oscuro'}`}>Postre</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 rounded-full border-2 ${filtro === 'bebida' ? 'bg-chido-texto-secundario-sobre-oscuro border-chido-texto-secundario-sobre-oscuro' : 'bg-chido-acento border-chido-texto-secundario-sobre-oscuro'}`}
            onPress={() => setFiltro(filtro === 'bebida' ? 'todos' : 'bebida')}
          >
            <Text className={`font-bold ${filtro === 'bebida' ? 'text-chido-cabecera' : 'text-chido-texto-secundario-sobre-oscuro'}`}>Bebida</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity 
          className="flex-row items-center bg-chido-cabecera border-2 border-white/70 px-4 py-2 rounded-full"
          onPress={() => router.push({ pathname: '/cliente/chat', params: { mesaId, numero: mesaNumero } })}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={colores.textoSobreOscuro} />
          <Text className="text-chido-texto-sobre-oscuro font-bold ml-2">Consultar al mozo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colores.textoSobreOscuro} />
        </View>
      ) : (
        <FlatList 
          className="flex-1"
          data={productosFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={ITEM_HEIGHT + ITEM_MARGIN}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 px-5">
              <Text className="text-chido-texto-sobre-oscuro text-center text-lg mt-10">No hay productos en esta categoría.</Text>
            </View>
          }
          renderItem={({ item: prod }) => {
            const cant = pedido[prod.id] || 0;
            return (
              <View 
                className="bg-chido-acento border-2 border-white/70 p-4 rounded-2xl"
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

                <View className="flex-row items-center justify-center gap-6 mt-auto">
                  <TouchableOpacity
                    className="w-12 h-12 bg-chido-botonPrincipal border-2 border-white/70 rounded-full items-center justify-center"
                    onPress={() => updateCantidad(prod.id, -1)}
                  >
                    <Ionicons name="remove" size={24} color={colores.textoSobreOscuro} />
                  </TouchableOpacity>
                  <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold w-8 text-center">{cant}</Text>

                  <TouchableOpacity
                    className="w-12 h-12 bg-chido-botonPrincipal border-2 border-white/70 rounded-full items-center justify-center"
                    onPress={() => updateCantidad(prod.id, 1)}
                  >
                    <Ionicons name="add" size={28} color={colores.textoSobreOscuro} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Cart Summary Bottom Bar */}
      <View 
        className="w-full"
      >
        <View 
          className="p-5 bg-chido-cabecera rounded-t-3xl shadow-lg border-t border-chido-acento"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <View className="flex-row justify-between mb-2">
            <Text className="text-chido-texto-sobre-oscuro text-lg">Tiempo est. total:</Text>
            <Text className="text-chido-texto-sobre-oscuro text-lg font-bold">{tiempoEstimado} min</Text>
          </View>
          <View className="flex-row justify-between mb-4">
            <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold">Total a pagar:</Text>
            <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold">${totalImporte}</Text>
          </View>
          <PrimaryButton 
            className="border-2 border-white/70 rounded-2xl"
            title={enviando ? 'Enviando pedido…' : (pedidoId ? 'Volver a enviar pedido' : (Object.keys(pedido).length > 0 ? 'Realizar pedido' : 'Seleccione un producto'))}
            onPress={Object.keys(pedido).length > 0 ? handleRealizarPedido : undefined}
            disabled={Object.keys(pedido).length === 0 || loading || enviando || cargandoPedido || !!errorCargaPedido}
          />
        </View>
      </View>
    </View>
  );
}
