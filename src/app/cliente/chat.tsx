import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSession } from '../../contexts/AppSessionContext';
import { Header } from '../../components/Header';
import { getMensajes, enviarMensaje, suscribirMensajes, Mensaje } from '../../services/chat.service';
import { colores } from '../../theme/colores';

export default function ChatCliente() {
  const router = useRouter();
  const { mesaId, numero } = useLocalSearchParams<{ mesaId: string, numero: string }>();
  const { usuario } = useAppSession();

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

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
    if (!nuevoMensaje.trim() || !usuario?.id || !mesaId) return;

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
    <View className="flex-1 bg-[#d97736]">
      <Header userName="Cliente" role={numero ? `Mesa ${numero}` : "Chat con Mozo"} />

      <View className="flex-row items-center p-4 bg-chido-acento">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl bg-chido-cabecera items-center justify-center mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colores.textoSobreOscuro} />
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
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {mensajes.map(msg => {
            const isMe = !msg.es_mozo;
            return (
              <View
                key={msg.id}
                className={`mb-4 max-w-[80%] rounded-2xl p-4 ${isMe ? 'bg-chido-cabecera self-end rounded-tr-sm' : 'bg-chido-texto-secundario-sobre-oscuro self-start rounded-tl-sm'}`}
              >
                <Text className={`font-bold mb-1 ${isMe ? 'text-yellow-200' : 'text-chido-texto-boton-outline'}`}>
                  {isMe ? 'Yo' : 'Mozo'}
                </Text>
                <Text className={`text-base ${isMe ? 'text-chido-texto-sobre-oscuro' : 'text-chido-texto-boton-outline'}`}>
                  {msg.texto}
                </Text>
                <Text className={`text-xs mt-2 self-end ${isMe ? 'text-white/70' : 'text-[#7a2e1f]/70'}`}>
                  {formatearHora(msg.created_at)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View className="p-4 bg-chido-acento flex-row items-center">
          <TextInput
            className="flex-1 bg-chido-superficie/20 rounded-full px-4 py-3 text-chido-texto-sobre-oscuro mr-3"
            placeholder="Escribe tu consulta..."
            placeholderTextColor={colores.textoSecundarioSobreOscuro}
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
          />
          <TouchableOpacity
            className="w-12 h-12 bg-chido-cabecera rounded-full items-center justify-center"
            onPress={handleEnviar}
          >
            <Ionicons name="send" size={20} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

