import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSession } from '../../contexts/AppSessionContext';
import { Header } from '../../components/Header';
import { getMensajes, enviarMensaje, suscribirMensajes, Mensaje } from '../../services/chat.service';
import { colores } from '../../theme/colores';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAvisoResultado } from '../../hooks/useAvisoResultado';

export default function ChatMesaMozo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mesaId?: string | string[]; numero?: string | string[] }>();
  const mesaId = Array.isArray(params.mesaId) ? params.mesaId[0] : params.mesaId;
  const numero = Array.isArray(params.numero) ? params.numero[0] : params.numero;

  const { usuario, role } = useAppSession();
  const { mostrarAviso, modalAviso } = useAvisoResultado();

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!mesaId) return;

    let cancelado = false;
    const cargarMensajes = async () => {
      try {
        const data = await getMensajes(mesaId);
        if (!cancelado) {
          setMensajes(data);
        }
      } catch (error) {
        console.error(error);
      }
    };
    void cargarMensajes();

    const desuscribir = suscribirMensajes(mesaId, (nuevoMsg) => {
      setMensajes((prev) => (prev.some((m) => m.id === nuevoMsg.id) ? prev : [...prev, nuevoMsg]));
    });

    return () => {
      cancelado = true;
      desuscribir();
    };
  }, [mesaId]);

  const handleEnviar = async () => {
    if (!nuevoMensaje.trim() || !usuario?.id || !mesaId) return;

    const texto = nuevoMensaje.trim();
    setNuevoMensaje(''); 
    
    try {
      // esMozo = true
      await enviarMensaje(mesaId, usuario.id, texto, true);
    } catch {
      mostrarAviso('No se pudo enviar el mensaje', 'Revisá la conexión e intentá nuevamente.');
    }
  };

  const formatearHora = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatearFecha = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const userName = usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Mozo";
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Mozo";

  return (
    <ImageBackground 
      source={require('../../../assets/images/fondo.jpeg')} 
      className="flex-1"
      resizeMode="cover"
    >
      <Header userName={userName} role={`${displayRole} - Chat Mesa ${numero || ''}`} />

      <View className="flex-row items-center px-4 py-2 bg-transparent">
        <TouchableOpacity
          className="flex-row items-center bg-chido-acento border-2 border-white/70 px-3 py-1 rounded-full"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/mozo/chats');
            }
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colores.textoSobreOscuro} />
          <Text className="text-chido-texto-sobre-oscuro font-bold ml-1">Volver</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}
        className="flex-1"
      >
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
                    {formatearFecha(msg.created_at)} · {formatearHora(msg.created_at)}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

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
      {modalAviso}
    </ImageBackground>
  );
}
