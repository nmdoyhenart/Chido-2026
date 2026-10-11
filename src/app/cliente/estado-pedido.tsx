import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  
  // Extract query params safely
  const params = useLocalSearchParams();
  const pedidoId = Array.isArray(params.pedidoId) ? params.pedidoId[0] : params.pedidoId;
  const clienteAnonimoId = Array.isArray(params.clienteAnonimoId) ? params.clienteAnonimoId[0] : params.clienteAnonimoId;
  const manualView = Array.isArray(params.manualView) ? params.manualView[0] : params.manualView;

  const [estado, setEstado] = useState<string>('pendiente_mozo');
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [cuentaSolicitada, setCuentaSolicitada] = useState(false);
  const [error, setError] = useState('');

  const estadoRef = React.useRef(estado);
  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  useEffect(() => {
    if (!pedidoId) return;

    const checkAndRedirect = (estadoActual: string) => {
      if (estadoActual !== 'pendiente_mozo' && estadoActual !== 'rechazado' && manualView !== 'true') {
        if (estadoRef.current === 'pendiente_mozo' && estadoActual === 'confirmado') {
          Alert.alert('Pedido Confirmado', 'Tu pedido ya está en preparación.', [
            { text: 'OK', onPress: () => router.replace({ pathname: '/cliente/pedido-realizado', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } }) }
          ]);
        } else {
          router.replace({ pathname: '/cliente/pedido-realizado', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } });
        }
      }
    };

    const fetchEstado = async () => {
      try {
        const estadoActual = clienteAnonimoId
          ? await getEstadoPedidoAnonimo(clienteAnonimoId, pedidoId)
          : await getEstadoPedido(pedidoId);
        checkAndRedirect(estadoActual);
        setEstado(estadoActual);
      } catch (e) {
        console.error(e);
      }
    };
    
    void fetchEstado();

    const intervalo = setInterval(() => { void fetchEstado(); }, 5000);

    const desuscribir = clienteAnonimoId ? () => {} : suscribirEstadoPedido(pedidoId, (nuevoEstado) => {
      checkAndRedirect(nuevoEstado);
      setEstado(nuevoEstado);
    });

    return () => {
      clearInterval(intervalo);
      desuscribir();
    };
  }, [pedidoId, clienteAnonimoId, manualView]);

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
      
      <View className="flex-1 p-2 items-center justify-center">
        {estado === 'pendiente_mozo' || estado === 'confirmado' ? (
          <Image
            source={require('../../../assets/images/mascota-espera.png')}
            style={{ width: '100%', height: 350, alignSelf: 'center', marginVertical: 8 }}
            resizeMode="contain"
          />
        ) : (
          <Ionicons 
            name="restaurant-outline" 
            size={80} 
            color={colores.textoSobreOscuro} 
          />
        )}
        
        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro mt-6 mb-2 text-center">
          Estado del Pedido
        </Text>
        
        <Text className="text-xl text-chido-texto-secundario-sobre-oscuro font-bold mt-4 text-center">
          {estado === 'pendiente_mozo' && 'Esperando confirmación del mozo...'}
          {estado === 'en_preparacion' && 'Cocina y bar están preparando tu pedido.'}
          {estado === 'entregado' && '¡Tu pedido ha sido entregado! ¡Que lo disfrutes!'}
          {estado === 'rechazado' && 'El mozo rechazó el pedido. Podés cambiar productos o cantidades y volver a enviarlo.'}
        </Text>

        {manualView === 'true' && (
          <TouchableOpacity 
            className="bg-chido-cabecera p-4 rounded-xl mt-10 w-full"
            onPress={() => router.back()}
          >
            <Text className="text-chido-texto-sobre-oscuro text-center font-bold text-lg">Volver</Text>
          </TouchableOpacity>
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
