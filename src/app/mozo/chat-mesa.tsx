import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSession } from '../../contexts/AppSessionContext';
import { Header } from '../../components/Header';
import { getMensajes, enviarMensaje, suscribirMensajes, Mensaje } from '../../services/chat.service';
import { colores } from '../../theme/colores';

export default function ChatMesaMozo() {
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
      // esMozo = true
      await enviarMensaje(mesaId, usuario.id, texto, true);
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
      <Header userName="Mozo" role={`Chat - Mesa ${numero}`} />

      <View className="flex-row items-center p-4 bg-[#b35e25]">
        <TouchableOpacity
          className="flex-row items-center mr-auto"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text className="text-white font-bold ml-2">Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 p-5"
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {mensajes.length === 0 ? (
          <Text className="text-white text-center mt-10">No hay mensajes en esta mesa.</Text>
        ) : (
          mensajes.map((msg) => {
            const isMe = msg.es_mozo;
            return (
              <View 
                key={msg.id}
                className={`p-3 rounded-2xl mb-4 max-w-[80%] ${
                  isMe ? 'bg-[#9c5120] self-end rounded-br-none' : 'bg-white self-start rounded-bl-none'
                }`}
              >
                <Text className={`text-base ${isMe ? 'text-white' : 'text-[#7a2e1f]'}`}>
                  {msg.texto}
                </Text>
                <Text className={`text-xs mt-2 self-end ${isMe ? 'text-white/70' : 'text-[#7a2e1f]/70'}`}>
                  {formatearHora(msg.created_at)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-row items-center p-4 bg-[#b35e25]">
          <TextInput 
            className="flex-1 bg-white p-3 rounded-full mr-2 text-[#7a2e1f]"
            placeholder="Escribe una respuesta..."
            placeholderTextColor="#9c5120"
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
            onSubmitEditing={handleEnviar}
          />
          <TouchableOpacity 
            className="w-12 h-12 bg-[#9c5120] rounded-full items-center justify-center"
            onPress={handleEnviar}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

