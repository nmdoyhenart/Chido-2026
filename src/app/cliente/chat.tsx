import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSession } from '../../contexts/AppSessionContext';
import { Header } from '../../components/Header';
import { getMensajes, enviarMensaje, suscribirMensajes, Mensaje } from '../../services/chat.service';
import { colores } from '../../theme/colores';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCampoVisibleConTeclado } from '../../hooks/useCampoVisibleConTeclado';

export default function ChatCliente() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mesaId: mesaIdParam, numero: numeroParam } = useLocalSearchParams<{ mesaId: string, numero: string }>();
  const { usuario } = useAppSession();

  const [mesaId, setMesaId] = useState<string | null>(mesaIdParam || null);
  const [numero, setNumero] = useState<string | null>(numeroParam || null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const { alDesplazar, alEnfocar, rellenoInferior } = useCampoVisibleConTeclado(scrollViewRef);

  useEffect(() => {
    if (!mesaId && usuario) {
      // Auto-resolve if missing (e.g. from push notification routing)
      import('../../services/mesas').then(({ obtenerMesaAsignada }) => {
        obtenerMesaAsignada(usuario.id).then((mesa) => {
          if (mesa) {
            setMesaId(mesa.id);
            setNumero(mesa.numero.toString());
          }
        });
      });
    }
  }, [mesaId, usuario]);

  useEffect(() => {
    if (!mesaId) return;

    const cargarMensajes = async () => {
      try {
        const data = await getMensajes(mesaId);
        setMensajes(data);
      } catch (error) {
        console.error(error);
      }
    };
    cargarMensajes();

    const desuscribir = suscribirMensajes(mesaId, (nuevoMsg) => {
      setMensajes(prev => [...prev, nuevoMsg]);
    });

    return desuscribir;
  }, [mesaId]);

  const handleEnviar = async () => {
    if (!nuevoMensaje.trim() || !usuario?.id) return;
    if (!mesaId) {
      Alert.alert('Aviso', 'No puedes enviar mensajes porque no estás asignado a ninguna mesa.');
      return;
    }

    const texto = nuevoMensaje.trim();
    setNuevoMensaje(''); 
    
    try {
      await enviarMensaje(mesaId, usuario.id, texto, false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
    }
  };

  const formatearHora = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role={numero ? `Mesa ${numero}` : "Chat con Mozo"} />

      <View className="flex-row items-center px-4 py-2 bg-transparent">
        <TouchableOpacity
          className="flex-row items-center bg-chido-acento border-2 border-white/70 px-3 py-1 rounded-full mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colores.textoSobreOscuro} />
          <Text className="text-chido-texto-sobre-oscuro font-bold ml-1">Volver</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-chido-texto-sobre-oscuro flex-1">Consulta al mozo</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1 p-5"
          ref={scrollViewRef}
          onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          onScroll={alDesplazar}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: rellenoInferior }}
        >
          {mensajes.map(msg => {
            const isMe = !msg.es_mozo;
            return (
              <View 
                key={msg.id} 
                className={`mb-4 max-w-[80%] rounded-2xl p-4 border border-white/30 ${isMe ? 'bg-chido-cabecera self-end rounded-tr-sm' : 'bg-chido-superficie self-start rounded-tl-sm'}`}
              >
                <Text className={`font-bold mb-1 ${isMe ? 'text-chido-aviso' : 'text-chido-texto-boton-outline'}`}>
                  {isMe ? 'Yo' : 'Mozo'}
                </Text>
                <Text className={`text-base ${isMe ? 'text-chido-texto-sobre-oscuro' : 'text-chido-texto-sobre-claro'}`}>
                  {msg.texto}
                </Text>
                <Text className={`text-xs mt-2 self-end ${isMe ? 'text-chido-texto-secundario-sobre-oscuro' : 'text-chido-texto-secundario-sobre-claro'}`}>
                  {formatearHora(msg.created_at)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View 
          className="p-4 bg-chido-acento flex-row items-center border-t border-white/30"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <TextInput
            className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl px-4 py-3 text-chido-texto-sobre-oscuro mr-3"
            placeholder="Escribe tu consulta..."
            placeholderTextColor={colores.textoSecundarioSobreOscuro}
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
            onFocus={alEnfocar}
            onSubmitEditing={handleEnviar}
          />
          <TouchableOpacity
            className="w-12 h-12 bg-chido-botonPrincipal border-2 border-white/70 rounded-full items-center justify-center"
            onPress={handleEnviar}
          >
            <Ionicons name="send" size={20} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
