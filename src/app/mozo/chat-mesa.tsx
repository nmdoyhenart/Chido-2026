import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSession } from '../../contexts/AppSessionContext';
import { Header } from '../../components/Header';
import { getMensajes, enviarMensaje, suscribirMensajes, Mensaje } from '../../services/chat.service';
import { colores } from '../../theme/colores';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatMesaMozo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mesaId, numero } = useLocalSearchParams<{ mesaId: string, numero: string }>();
  const { usuario, role } = useAppSession();

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

  const userName = usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Mozo";
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Mozo";

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={userName} role={`${displayRole} - Chat Mesa ${numero}`} />

      <View className="flex-row items-center px-4 py-2 bg-transparent">
        <TouchableOpacity
          className="flex-row items-center bg-chido-acento border-2 border-white/70 px-3 py-1 rounded-full"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colores.textoSobreOscuro} />
          <Text className="text-chido-texto-sobre-oscuro font-bold ml-1">Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 p-5"
        ref={scrollViewRef}
        onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {mensajes.length === 0 ? (
          <Text className="text-chido-texto-sobre-oscuro text-center mt-10">No hay mensajes en esta mesa.</Text>
        ) : (
          mensajes.map(msg => {
            const isMe = msg.es_mozo;
            return (
              <View 
                key={msg.id} 
                className={`p-4 rounded-2xl mb-4 max-w-[80%] border border-white/30 ${
                  isMe ? 'bg-chido-superficie self-end rounded-tr-sm' : 'bg-chido-cabecera self-start rounded-tl-sm'
                }`}
              >
                <Text className={`font-bold mb-1 ${isMe ? 'text-chido-texto-boton-outline' : 'text-chido-aviso'}`}>
                  {isMe ? 'Yo' : 'Cliente'}
                </Text>
                <Text className={`text-base ${isMe ? 'text-chido-texto-sobre-claro' : 'text-chido-texto-sobre-oscuro'}`}>
                  {msg.texto}
                </Text>
                <Text className={`text-xs mt-2 self-end ${isMe ? 'text-chido-texto-secundario-sobre-claro' : 'text-chido-texto-secundario-sobre-oscuro'}`}>
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
        <View 
          className="flex-row items-center p-4 bg-chido-cabecera border-t border-white/30"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <TextInput 
            className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl px-4 py-3 mr-3 text-chido-texto-sobre-oscuro"
            placeholder="Escribe una respuesta..."
            placeholderTextColor={colores.textoSecundarioAlternativo}
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
            onSubmitEditing={handleEnviar}
          />
          <TouchableOpacity 
            className="w-12 h-12 bg-chido-botonPrincipal border-2 border-white/70 rounded-full items-center justify-center"
            onPress={handleEnviar}
            disabled={!nuevoMensaje.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
