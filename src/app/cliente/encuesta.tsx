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
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMensaje(null);
    if (comida === 0 || atencion === 0 || experiencia === 0) {
      setErrorMensaje('Por favor calificá todos los aspectos (comida, atención y recomendación).');
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
      router.back();
    } catch (error: any) {
      if (error?.message?.includes('Ya enviaste una encuesta')) {
        if (pedidoId) {
          await AsyncStorage.setItem(`encuesta_completada_${pedidoId}`, 'true');
        }
        router.back();
        return;
      }
      setErrorMensaje(error.message || 'No se pudo enviar la encuesta.');
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
            className="flex-1 px-5 justify-between pt-2"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View>
              <Text className="text-2xl font-bold text-chido-texto-sobre-oscuro text-center mb-3">
                ¿Qué te pareció todo?
              </Text>

              {/* 1. Control: Estrellas para Comida */}
              <View className="mb-6">
                <Text className="text-lg text-chido-texto-sobre-oscuro mb-2 font-bold">La Comida</Text>
                <View className="flex-row justify-between px-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <TouchableOpacity
                      key={`comida-${val}`}
                      onPress={() => {
                        setComida(val);
                        setErrorMensaje(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={val <= comida ? 'star' : 'star-outline'}
                        size={38}
                        color={val <= comida ? '#FFD700' : colores.textoSobreOscuro}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 2. Control: Botones numéricos para Atención */}
              <View className="mb-6">
                <Text className="text-lg text-chido-texto-sobre-oscuro mb-2 font-bold">
                  La Atención del Mozo
                </Text>
                <View className="flex-row justify-between">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <TouchableOpacity
                      key={`atencion-${val}`}
                      onPress={() => {
                        setAtencion(val);
                        setErrorMensaje(null);
                      }}
                      className={`w-12 h-12 rounded-full items-center justify-center border-2 ${
                        val === atencion ? 'bg-chido-acento border-chido-acento' : 'border-white/50'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text className="text-xl font-bold text-chido-texto-sobre-oscuro">{val}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 3. Control: Botones de Recomendación */}
              <View className="mb-6">
                <Text className="text-lg text-chido-texto-sobre-oscuro mb-2 font-bold">
                  ¿Recomendarías este lugar a otra persona?
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Sí, lo recomiendo"
                    onPress={() => {
                      setExperiencia(5);
                      setErrorMensaje(null);
                    }}
                    className={`flex-1 flex-row items-center justify-center py-3 px-3 rounded-2xl border-2 ${
                      experiencia === 5
                        ? 'bg-chido-acento border-white'
                        : 'bg-chido-cabecera border-white/50'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={experiencia === 5 ? 'thumbs-up' : 'thumbs-up-outline'}
                      size={22}
                      color={colores.textoSobreOscuro}
                    />
                    <Text className="ml-2 text-sm font-extrabold text-chido-texto-sobre-oscuro text-center">
                      Sí, lo recomiendo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="No lo recomiendo"
                    onPress={() => {
                      setExperiencia(1);
                      setErrorMensaje(null);
                    }}
                    className={`flex-1 flex-row items-center justify-center py-3 px-3 rounded-2xl border-2 ${
                      experiencia === 1
                        ? 'bg-chido-error border-white'
                        : 'bg-chido-cabecera border-white/50'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={experiencia === 1 ? 'thumbs-down' : 'thumbs-down-outline'}
                      size={22}
                      color={colores.textoSobreOscuro}
                    />
                    <Text className="ml-2 text-sm font-extrabold text-chido-texto-sobre-oscuro text-center">
                      No lo recomiendo
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4. Control: TextInput para comentarios */}
              <View className="mb-2">
                <Input
                  label="Comentarios (Opcional)"
                  placeholder="¿Algo más que nos quieras decir?"
                  value={comentario}
                  onChangeText={setComentario}
                  multiline={true}
                  numberOfLines={2}
                  textAlignVertical="top"
                  style={{ height: 62 }}
                />
              </View>
            </View>

            {/* Parte inferior: error si existe + botón Enviar */}
            <View>
              {errorMensaje && (
                <View className="mb-2 bg-chido-cabecera border-2 border-white/70 py-2 px-3 rounded-xl flex-row items-center">
                  <Ionicons name="alert-circle-outline" size={20} color={colores.textoSobreOscuro} />
                  <Text className="text-chido-texto-sobre-oscuro font-bold text-xs ml-2 flex-1">
                    {errorMensaje}
                  </Text>
                </View>
              )}

              <PrimaryButton
                title="Enviar Encuesta"
                onPress={handleSubmit}
                isLoading={enviando}
                className="mb-1"
              />
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </View>
  );
}
