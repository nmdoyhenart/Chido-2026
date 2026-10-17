import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../../components/Header';
import { colores } from '../../theme/colores';
import { enviarEncuesta } from '../../services/encuestas.service';
import { useAppSession } from '../../contexts/AppSessionContext';
import { Input } from '../../components/ui/Input';
import { PrimaryButton } from '../../components/ui/Buttons';
import { ResultadoModal } from '../../components/ui/ResultadoModal';

type ModalConfig = {
  tipo: 'exito' | 'error';
  titulo: string;
  mensaje: string;
  accion: string;
  onClose: () => void;
} | null;

export default function EncuestaCliente() {
  const insets = useSafeAreaInsets();
  const { pedidoId, clienteAnonimoId: rawAnonimoId } = useLocalSearchParams<{
    pedidoId: string;
    clienteAnonimoId?: string;
  }>();
  const { usuario } = useAppSession();
  const clienteAnonimoId = !usuario?.id && rawAnonimoId ? rawAnonimoId : undefined;

  const [comida, setComida] = useState<number>(0);
  const [atencion, setAtencion] = useState<number>(0);
  const [experiencia, setExperiencia] = useState<number>(0);
  const [comentario, setComentario] = useState<string>('');
  const [enviando, setEnviando] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>(null);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (comida === 0 || atencion === 0 || experiencia === 0) {
      setModalConfig({
        tipo: 'error',
        titulo: 'Encuesta incompleta',
        mensaje: 'Por favor calificá todos los aspectos (comida, atención y recomendación) antes de enviar.',
        accion: 'Completar',
        onClose: () => setModalConfig(null),
      });
      return;
    }

    setEnviando(true);
    try {
      await enviarEncuesta({
        pedido_id: pedidoId!,
        cliente_id: clienteAnonimoId ? undefined : usuario?.id,
        lista_espera_id: clienteAnonimoId,
        comida,
        atencion,
        experiencia,
        comentario: comentario.trim() || undefined,
      });

      if (pedidoId) {
        await AsyncStorage.setItem(`encuesta_completada_${pedidoId}`, 'true');
      }

      setModalConfig({
        tipo: 'exito',
        titulo: '¡Muchas gracias!',
        mensaje: 'Tu opinión fue enviada con éxito y nos ayuda a seguir mejorando.',
        accion: 'Aceptar',
        onClose: () => {
          setModalConfig(null);
          router.back();
        },
      });
    } catch (error: any) {
      if (error?.message?.includes('Ya enviaste una encuesta')) {
        if (pedidoId) {
          await AsyncStorage.setItem(`encuesta_completada_${pedidoId}`, 'true');
        }
        setModalConfig({
          tipo: 'exito',
          titulo: 'Encuesta ya registrada',
          mensaje: 'Ya habíamos registrado tu opinión para este pedido. ¡Muchas gracias!',
          accion: 'Aceptar',
          onClose: () => {
            setModalConfig(null);
            router.back();
          },
        });
        return;
      }

      setModalConfig({
        tipo: 'error',
        titulo: 'No se pudo enviar',
        mensaje: error.message || 'Ocurrió un error al enviar la encuesta. Por favor intentá nuevamente.',
        accion: 'Reintentar',
        onClose: () => setModalConfig(null),
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View className="flex-1 bg-chido-fondo">
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName="Cliente" role="Encuesta" />

      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        className="flex-1"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 4 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            className="flex-1 px-5 justify-between pt-3"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="flex-1 justify-between pb-3">
              <Text className="text-2xl font-bold text-chido-texto-sobre-oscuro text-center mb-1">
                ¿Qué te pareció todo?
              </Text>

              {/* 1. Control: Estrellas para Comida */}
              <View>
                <Text className="text-lg text-chido-texto-sobre-oscuro mb-2 font-bold">La Comida</Text>
                <View className="flex-row justify-between px-3">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <TouchableOpacity
                      key={`comida-${val}`}
                      onPress={() => setComida(val)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={val <= comida ? 'star' : 'star-outline'}
                        size={42}
                        color={val <= comida ? '#FFD700' : colores.textoSobreOscuro}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 2. Control: Botones numéricos para Atención */}
              <View>
                <Text className="text-lg text-chido-texto-sobre-oscuro mb-2 font-bold">
                  La Atención del Mozo
                </Text>
                <View className="flex-row justify-between px-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <TouchableOpacity
                      key={`atencion-${val}`}
                      onPress={() => setAtencion(val)}
                      className={`rounded-full items-center justify-center border-2 ${
                        val === atencion ? 'bg-chido-acento border-chido-acento' : 'border-white/50'
                      }`}
                      style={{ width: 50, height: 50 }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-xl font-bold text-chido-texto-sobre-oscuro">{val}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 3. Control: Botones de Recomendación */}
              <View>
                <Text className="text-lg text-chido-texto-sobre-oscuro mb-2 font-bold">
                  ¿Recomendarías este lugar a otra persona?
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Sí, lo recomiendo"
                    onPress={() => setExperiencia(5)}
                    className={`flex-1 flex-row items-center justify-center py-3.5 px-3 rounded-2xl border-2 ${
                      experiencia === 5
                        ? 'bg-chido-acento border-white'
                        : 'bg-chido-cabecera border-white/50'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={experiencia === 5 ? 'thumbs-up' : 'thumbs-up-outline'}
                      size={24}
                      color={colores.textoSobreOscuro}
                    />
                    <Text className="ml-2 text-base font-extrabold text-chido-texto-sobre-oscuro text-center">
                      Sí, lo recomiendo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="No lo recomiendo"
                    onPress={() => setExperiencia(1)}
                    className={`flex-1 flex-row items-center justify-center py-3.5 px-3 rounded-2xl border-2 ${
                      experiencia === 1
                        ? 'bg-chido-error border-white'
                        : 'bg-chido-cabecera border-white/50'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={experiencia === 1 ? 'thumbs-down' : 'thumbs-down-outline'}
                      size={24}
                      color={colores.textoSobreOscuro}
                    />
                    <Text className="ml-2 text-base font-extrabold text-chido-texto-sobre-oscuro text-center">
                      No lo recomiendo
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4. Control: TextInput para comentarios */}
              <View>
                <Input
                  label="Comentarios (Opcional)"
                  placeholder="¿Algo más que nos quieras decir?"
                  value={comentario}
                  onChangeText={setComentario}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ height: 75 }}
                />
              </View>

              {/* Botón Enviar */}
              <View className="pt-2">
                <PrimaryButton
                  title="Enviar Encuesta"
                  onPress={handleSubmit}
                  isLoading={enviando}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>

      <ResultadoModal
        visible={Boolean(modalConfig)}
        tipo={modalConfig?.tipo ?? 'error'}
        titulo={modalConfig?.titulo ?? ''}
        mensaje={modalConfig?.mensaje ?? ''}
        accion={modalConfig?.accion ?? 'Entendido'}
        onClose={modalConfig?.onClose ?? (() => setModalConfig(null))}
      />
    </View>
  );
}
