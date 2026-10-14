import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { colores } from '../../theme/colores';
import { getEstadoPedido, getEstadoPedidoAnonimo, suscribirEstadoPedido } from '../../services/pedidos.service';
import { verificarEncuesta } from '../../services/encuestas.service';
import { useCallback } from 'react';

export default function PedidoRealizado() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Safe extraction of params (handle arrays properly)
  const params = useLocalSearchParams();
  const pedidoId = Array.isArray(params.pedidoId) ? params.pedidoId[0] : params.pedidoId;
  const clienteAnonimoId = Array.isArray(params.clienteAnonimoId) ? params.clienteAnonimoId[0] : params.clienteAnonimoId;
  
  const [estado, setEstado] = useState<string>('pendiente_mozo');
  const [cargando, setCargando] = useState(true);
  const [encuestaCompletada, setEncuestaCompletada] = useState(false);
  const estadoLegible: Record<string, string> = {
    pendiente_mozo: 'Esperando confirmación del mozo',
    confirmado: 'Pedido confirmado · enviado a los sectores',
    en_preparacion: 'Tu pedido está en preparación',
    entregado: 'El mozo marcó el pedido como entregado',
    recibido: 'Recepción confirmada',
    rechazado: 'Pedido rechazado · podés modificarlo',
  };

  // Verificar si la encuesta ya se llenó cada vez que volvemos a esta pantalla
  useFocusEffect(
    useCallback(() => {
      if (pedidoId) {
        import('@react-native-async-storage/async-storage').then(m => m.default.getItem(`encuesta_completada_${pedidoId}`).then(val => { if (val === 'true') setEncuestaCompletada(true); else verificarEncuesta(pedidoId).then(setEncuestaCompletada); }))
      }
    }, [pedidoId])
  );

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
      } finally {
        setCargando(false);
      }
    };
    
    void fetchEstado();
    
    const intervalo = setInterval(() => { void fetchEstado(); }, 5000);
    const desuscribir = clienteAnonimoId ? () => {} : suscribirEstadoPedido(pedidoId, (nuevoEstado) => {
      setEstado(nuevoEstado);
    });

    return () => {
      clearInterval(intervalo);
      desuscribir();
    };
  }, [pedidoId, clienteAnonimoId]);

  const [altoDisponible, setAltoDisponible] = useState(0);
  const compacto = altoDisponible > 0 && altoDisponible < 620;
  const espacio = compacto ? 10 : 14;
  const tarjeta = { 
    flexGrow: 1, 
    flexBasis: 0, 
    minHeight: 112, 
    justifyContent: 'center' as const, 
    padding: compacto ? 16 : 24 
  };

  if (cargando) {
    return (
      <View className="flex-1 bg-chido-fondo justify-center items-center">
        <ActivityIndicator size="large" color={colores.textoSobreOscuro} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role="Tu Mesa" />
      
      <ScrollView
        className="flex-1"
        onLayout={({ nativeEvent }) => setAltoDisponible(nativeEvent.layout.height)}
        contentContainerStyle={{ 
          flexGrow: 1, 
          gap: espacio, 
          paddingHorizontal: 16, 
          paddingTop: espacio, 
          paddingBottom: Math.max(insets.bottom, espacio) 
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Text 
          className="text-3xl font-bold text-chido-texto-sobre-oscuro text-center mb-2" 
          style={{ paddingVertical: compacto ? 6 : 10 }}
        >
          ¿Qué deseas hacer?
        </Text>

        <View accessibilityLiveRegion="polite" className="rounded-xl border border-white/60 bg-chido-superficieTerracota px-4 py-3">
          <Text className="text-sm font-semibold text-chido-texto-secundario-sobre-oscuro">Estado de tu pedido</Text>
          <Text className="mt-1 text-lg font-extrabold text-chido-texto-sobre-oscuro">
            {estadoLegible[estado] ?? 'Actualizando estado…'}
          </Text>
        </View>

        <Pressable 
          accessibilityRole="button" 
          accessibilityLabel="Juegos con premios" 
          className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" 
          style={tarjeta} 
          onPress={() => router.push({ pathname: '/cliente/juegos', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } })}
        >
          <View className="flex-row items-center">
            <Ionicons name="game-controller-outline" size={52} color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Jugar</Text>
              <Text className="mt-1 text-base font-bold text-chido-texto-secundario-sobre-oscuro">Ganá descuentos para tu cuenta</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
          </View>
        </Pressable>

        <Pressable 
          accessibilityRole="button" 
          accessibilityLabel="Completar encuesta de satisfacción" 
          disabled={encuestaCompletada}
          className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${encuestaCompletada ? 'opacity-50' : ''}`} 
          style={tarjeta} 
          onPress={() => router.push({ pathname: '/cliente/encuesta', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } })}
        >
          <View className="flex-row items-center">
            <Ionicons name="star-outline" size={52} color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Encuesta</Text>
              <Text className="mt-1 text-base font-bold text-chido-texto-secundario-sobre-oscuro">
                {encuestaCompletada ? '¡Gracias por tu opinión!' : 'Dejanos tu opinión'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
          </View>
        </Pressable>

        <Pressable 
          accessibilityRole="button" 
          accessibilityLabel="Pedir la cuenta" 
          className="rounded-2xl border-2 border-white/70 bg-chido-acento mt-4" 
          style={tarjeta} 
          onPress={() => router.push({ pathname: '/cliente/pedir-cuenta', params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } })}
        >
          <View className="flex-row items-center">
            <Ionicons name="receipt-outline" size={52} color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Pedir cuenta</Text>
              <Text className="mt-1 text-base font-bold text-chido-texto-sobre-oscuro">Escaneá la propina y finalizá</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
          </View>
        </Pressable>

      </ScrollView>
    </View>
  );
}

