import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSession } from '../../contexts/AppSessionContext';
import { Header } from '../../components/Header';
import { getMensajes, enviarMensaje, suscribirMensajes, Mensaje } from '../../services/chat.service';
import { colores } from '../../theme/colores';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCampoVisibleConTeclado } from '../../hooks/useCampoVisibleConTeclado';
import { useAvisoResultado } from '../../hooks/useAvisoResultado';
import { useNombreCliente } from '../../hooks/useNombreCliente';

export default function ChatCliente() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mesaId?: string | string[]; numero?: string | string[]; clienteAnonimoId?: string | string[] }>();
  const mesaIdParam = Array.isArray(params.mesaId) ? params.mesaId[0] : params.mesaId;
  const numeroParam = Array.isArray(params.numero) ? params.numero[0] : params.numero;
  const clienteAnonimoIdParam = Array.isArray(params.clienteAnonimoId) ? params.clienteAnonimoId[0] : params.clienteAnonimoId;

  const { usuario } = useAppSession();
  const { mostrarAviso, modalAviso } = useAvisoResultado();
  const { nombreCliente } = useNombreCliente(clienteAnonimoIdParam);

  const [mesaId, setMesaId] = useState<string | null>(mesaIdParam || null);
  const [numero, setNumero] = useState<string | null>(numeroParam || null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { alDesplazar, alEnfocar, rellenoInferior } = useCampoVisibleConTeclado(scrollViewRef);

  useEffect(() => {
    if (mesaIdParam && mesaIdParam !== mesaId) {
      setMesaId(mesaIdParam);
    }
    if (numeroParam && numeroParam !== numero) {
      setNumero(numeroParam);
    }
  }, [mesaIdParam, numeroParam]);

  useEffect(() => {
    if (mesaId && numero) return;

    if (!mesaId) {
      if (usuario?.id) {
        import('../../services/mesas').then(({ obtenerMesaAsignada }) => {
          obtenerMesaAsignada(usuario.id).then((mesa) => {
            if (mesa) {
              setMesaId(mesa.id);
              setNumero(mesa.numero.toString());
            }
          });
        });
      } else {
        (async () => {
          const identificador = clienteAnonimoIdParam || await AsyncStorage.getItem('cliente_anonimo_id');
          if (identificador) {
            const { obtenerClienteEnListaPorId } = await import('../../../lib/clientesAnonimos');
            const cliente = await obtenerClienteEnListaPorId(identificador);
            if (cliente?.mesa_id) {
              setMesaId(cliente.mesa_id);
              const { obtenerMesas } = await import('../../services/mesas');
              const mesas = await obtenerMesas();
              const m = mesas.find((x) => x.id === cliente.mesa_id);
              if (m) setNumero(m.numero.toString());
            }
          }
        })();
      }
    } else if (mesaId && !numero) {
      import('../../services/mesas').then(({ obtenerMesas }) => {
        obtenerMesas().then((mesas) => {
          const m = mesas.find((x) => x.id === mesaId);
          if (m) setNumero(m.numero.toString());
        });
      });
    }
  }, [mesaId, numero, usuario?.id, clienteAnonimoIdParam]);

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
    if (!nuevoMensaje.trim() || enviando) return;
    if (!mesaId) {
      mostrarAviso('No hay una mesa asignada', 'No podés enviar mensajes porque todavía no estás asignado a una mesa.');
      return;
    }

    const texto = nuevoMensaje.trim();
    setNuevoMensaje(''); 
    setEnviando(true);
    
    try {
      await enviarMensaje(mesaId, usuario?.id || null, texto, false);
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
      mostrarAviso('No se pudo enviar el mensaje', 'Revisá la conexión e intentá nuevamente.');
      setNuevoMensaje(texto);
    } finally {
      setEnviando(false);
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

  return (
    <ImageBackground 
      source={require('../../../assets/images/fondo.jpeg')} 
      className="flex-1"
      resizeMode="cover"
    >
      <Header userName={nombreCliente} role={numero ? `Mesa ${numero}` : "Chat con Mozo"} />

      <View className="flex-row items-center px-4 py-2 bg-transparent">
        <TouchableOpacity
          className="flex-row items-center bg-chido-acento border-2 border-white/70 px-3 py-1 rounded-full mr-4"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(usuario ? '/cliente/home' : '/cliente-anonimo/espera');
            }
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colores.textoSobreOscuro} />
          <Text className="text-chido-texto-sobre-oscuro font-bold ml-1">Volver</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-chido-texto-sobre-oscuro flex-1">Consulta al mozo</Text>
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
          onScroll={alDesplazar}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: rellenoInferior }}
        >
          {mensajes.map((msg) => {
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
                  {formatearFecha(msg.created_at)} · {formatearHora(msg.created_at)}
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
            className={`w-12 h-12 bg-chido-botonPrincipal border-2 border-white/70 rounded-full items-center justify-center ${enviando || !nuevoMensaje.trim() ? 'opacity-50' : ''}`}
            onPress={handleEnviar}
            disabled={enviando || !nuevoMensaje.trim()}
          >
            <Ionicons name="send" size={20} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {modalAviso}
    </ImageBackground>
  );
}
