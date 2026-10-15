import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../../components/Header';
import { useAppSession } from '../../contexts/AppSessionContext';
import { colores } from '../../theme/colores';
import { verificarEncuesta } from '../../services/encuestas.service';

export default function PedidoRealizado() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { usuario } = useAppSession();
  
  // Safe extraction of params (handle arrays properly)
  const params = useLocalSearchParams();
  const pedidoId = Array.isArray(params.pedidoId) ? params.pedidoId[0] : params.pedidoId;
  const rawAnonimoId = Array.isArray(params.clienteAnonimoId) ? params.clienteAnonimoId[0] : params.clienteAnonimoId;
  const clienteAnonimoId = !usuario?.id && rawAnonimoId ? rawAnonimoId : undefined;
  
  const [encuestaCompletada, setEncuestaCompletada] = useState(false);

  // Verificar si la encuesta ya se llenó cada vez que volvemos a esta pantalla
  useFocusEffect(
    useCallback(() => {
      if (pedidoId) {
        AsyncStorage.getItem(`encuesta_completada_${pedidoId}`).then((val) => {
          if (val === 'true') {
            setEncuestaCompletada(true);
          } else {
            verificarEncuesta(pedidoId).then(setEncuestaCompletada);
          }
        });
      }
    }, [pedidoId])
  );

  const handlePedirCuenta = () => {
    if (!pedidoId) return;
    router.push({
      pathname: '/cliente/pedir-cuenta',
      params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) },
    });
  };

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

        <Pressable 
          accessibilityRole="button" 
          accessibilityLabel="Juegos con premios" 
          className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" 
          style={tarjeta} 
          onPress={() => router.push({ pathname: '/juegos' as any, params: { pedidoId, ...(clienteAnonimoId ? { clienteAnonimoId } : {}) } })}
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
          className="rounded-2xl border-2 border-white/70 bg-chido-cabecera mt-2" 
          style={tarjeta} 
          onPress={handlePedirCuenta}
        >
          <View className="flex-row items-center">
            <Ionicons name="receipt-outline" size={52} color={colores.textoSobreOscuro} />
            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>
                Pedir cuenta
              </Text>
              <Text className="mt-1 text-base font-bold text-chido-texto-sobre-oscuro">
                Escaneá la propina y pagá tu cuenta
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
          </View>
        </Pressable>

      </ScrollView>
    </View>
  );
}

