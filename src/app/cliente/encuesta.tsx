import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { colores } from '../../theme/colores';
import { enviarEncuesta } from '../../services/encuestas.service';
import { useAppSession } from '../../contexts/AppSessionContext';
import { Input } from '../../components/ui/Input';
import { PrimaryButton } from '../../components/ui/Buttons';
import { useCampoVisibleConTeclado } from '../../hooks/useCampoVisibleConTeclado';
import { useAltoDisponible } from '../../hooks/useAltoDisponible';

export default function EncuestaCliente() {
  const router = useRouter();
  const { pedidoId, clienteAnonimoId: rawAnonimoId } = useLocalSearchParams<{ pedidoId: string; clienteAnonimoId?: string }>();
  const { usuario } = useAppSession();
  const clienteAnonimoId = !usuario?.id && rawAnonimoId ? rawAnonimoId : undefined;

  const scroll = useRef<ScrollView>(null);
  const { alDesplazar, alEnfocar, rellenoInferior } = useCampoVisibleConTeclado(scroll);
  // Sin teclado el formulario entra completo; con teclado se permite desplazar para ver el comentario.
  const tecladoAbierto = rellenoInferior > 0;
  const { alMedir, compacto, muyCompacto } = useAltoDisponible();
  const tamEstrella = muyCompacto ? 32 : compacto ? 36 : 40;
  const tamCirculo = muyCompacto ? 44 : compacto ? 50 : 56;
  const tituloSeccion = `${compacto ? 'text-lg mb-2' : 'text-xl mb-3'} text-chido-texto-sobre-oscuro font-bold`;

  const [comida, setComida] = useState<number>(0);
  const [atencion, setAtencion] = useState<number>(0);
  const [experiencia, setExperiencia] = useState<number>(0);
  const [comentario, setComentario] = useState<string>('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (comida === 0 || atencion === 0 || experiencia === 0) {
      Alert.alert('Incompleto', 'Por favor califica todos los aspectos (comida, atención y recomendación).');
      return;
    }

    setEnviando(true);
    try {
      await enviarEncuesta({
        pedido_id: pedidoId!,
        cliente_id: clienteAnonimoId ? undefined : usuario?.id,
        lista_espera_id: clienteAnonimoId, // Si es anónimo, el ID viene acá
        comida,
        atencion,
        experiencia,
        comentario
      });
      
      Alert.alert('¡Gracias!', 'Tu opinión nos ayuda a mejorar.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar la encuesta.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role="Encuesta" />
      
      <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1">
        <KeyboardAvoidingView 
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            ref={scroll}
            className="flex-1"
            onLayout={alMedir}
            scrollEnabled={tecladoAbierto}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: compacto ? 12 : 20, paddingBottom: 12 + rellenoInferior }}
            keyboardShouldPersistTaps="handled"
            onScroll={alDesplazar}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            <Text className={`${compacto ? 'text-xl' : 'text-2xl'} font-bold text-chido-texto-sobre-oscuro text-center`}>
              ¿Qué te pareció todo?
            </Text>

            {/* 1. Control: Estrellas para Comida */}
            <View>
              <Text className={tituloSeccion}>La Comida</Text>
              <View className="flex-row justify-between px-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <TouchableOpacity key={`comida-${val}`} onPress={() => setComida(val)}>
                    <Ionicons
                      name={val <= comida ? 'star' : 'star-outline'}
                      size={tamEstrella}
                      color={val <= comida ? '#FFD700' : colores.textoSobreOscuro} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 2. Control: Botones numéricos para Atención */}
            <View>
              <Text className={tituloSeccion}>La Atención del Mozo</Text>
              <View className="flex-row justify-between">
                {[1, 2, 3, 4, 5].map((val) => (
                  <TouchableOpacity
                    key={`atencion-${val}`}
                    onPress={() => setAtencion(val)}
                    style={{ width: tamCirculo, height: tamCirculo }}
                    className={`rounded-full items-center justify-center border-2 ${val === atencion ? 'bg-chido-acento border-chido-acento' : 'border-white/50'}`}
                  >
                    <Text className="text-2xl font-bold text-chido-texto-sobre-oscuro">{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 3. Control: Botones de Recomendación */}
            <View>
              <Text className={tituloSeccion}>
                ¿Recomendarías este lugar a otra persona?
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  accessibilityRole="button"
                  accessibilityLabel="Sí, lo recomiendo"
                  onPress={() => setExperiencia(5)}
                  className={`flex-1 flex-row items-center justify-center ${compacto ? 'py-3' : 'py-4'} px-3 rounded-2xl border-2 ${
                    experiencia === 5 
                      ? 'bg-chido-acento border-white' 
                      : 'bg-chido-cabecera border-white/50'
                  }`}
                >
                  <Ionicons 
                    name={experiencia === 5 ? "thumbs-up" : "thumbs-up-outline"} 
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
                  className={`flex-1 flex-row items-center justify-center ${compacto ? 'py-3' : 'py-4'} px-3 rounded-2xl border-2 ${
                    experiencia === 1 
                      ? 'bg-chido-error border-white' 
                      : 'bg-chido-cabecera border-white/50'
                  }`}
                >
                  <Ionicons 
                    name={experiencia === 1 ? "thumbs-down" : "thumbs-down-outline"} 
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
                onFocus={alEnfocar}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                style={{ height: muyCompacto ? 64 : compacto ? 76 : 100 }}
              />
            </View>

            <PrimaryButton
              title="Enviar Encuesta"
              onPress={handleSubmit}
              isLoading={enviando}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
