import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { supabase } from '../../../lib/supabase';

type Mensaje = {
  id: string;
  mesa: number;
  texto: string;
  es_mozo: boolean;
  fecha: string;
};

export default function ChatCliente() {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);


  const numMesa = 4;

  useEffect(() => {
    setMensajes([
      { id: '1', mesa: numMesa, texto: 'Hola, ¿pueden traer más servilletas?', es_mozo: false, fecha: new Date().toISOString() },
      { id: '2', mesa: numMesa, texto: '¡Enseguida se las llevo!', es_mozo: true, fecha: new Date().toISOString() },
    ]);
  }, []);

  const handleEnviar = () => {
    if (!nuevoMensaje.trim()) return;

    const msg: Mensaje = {
      id: Date.now().toString(),
      mesa: numMesa,
      texto: nuevoMensaje.trim(),
      es_mozo: false,
      fecha: new Date().toISOString(),
    };

    setMensajes(prev => [...prev, msg]);
    setNuevoMensaje('');
    
    setTimeout(() => {
      const mozoMsg: Mensaje = {
        id: (Date.now() + 1).toString(),
        mesa: numMesa,
        texto: 'Recibido, voy para allá.',
        es_mozo: true,
        fecha: new Date().toISOString(),
      };
      setMensajes(prev => [...prev, mozoMsg]);
    }, 2000);
  };

  const formatearHora = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View className="flex-1 bg-[#d97736]">
      <Header userName="Cliente" role={`Mesa ${numMesa}`} />

      <View className="flex-row items-center p-4 bg-[#b35e25]">
        <TouchableOpacity 
          className="w-10 h-10 rounded-xl bg-[#9c5120] items-center justify-center mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white flex-1">Consulta al mozo</Text>
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
                className={`mb-4 max-w-[80%] rounded-2xl p-4 ${isMe ? 'bg-[#9c5120] self-end rounded-tr-sm' : 'bg-[#e2b99f] self-start rounded-tl-sm'}`}
              >
                <Text className={`font-bold mb-1 ${isMe ? 'text-yellow-200' : 'text-[#7a2e1f]'}`}>
                  {isMe ? 'Yo' : 'Mozo'}
                </Text>
                <Text className={`text-base ${isMe ? 'text-white' : 'text-[#7a2e1f]'}`}>
                  {msg.texto}
                </Text>
                <Text className={`text-xs mt-2 self-end ${isMe ? 'text-white/70' : 'text-[#7a2e1f]/70'}`}>
                  {formatearHora(msg.fecha)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View className="p-4 bg-[#b35e25] flex-row items-center">
          <TextInput 
            className="flex-1 bg-white/20 rounded-full px-4 py-3 text-white mr-3"
            placeholder="Escribe tu consulta..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
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

