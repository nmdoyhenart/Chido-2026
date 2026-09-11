import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { authService } from '../../services/auth.service';
import AccesoRapidoModal from '../../components/auth/AccesoRapidoModal'
import { useAppSession } from '../../contexts/AppSessionContext';

export default function LoginScreen() {
  const router = useRouter();
  const { clearSession, enterGuest } = useAppSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState<{
    titulo: string;
    mensaje: string;
  } | null>(null);

  // Controla si el modal de acceso rápido está abierto o cerrado
  const [accesoRapidoVisible, setAccesoRapidoVisible] = useState(false);

  const mostrarAvisoError = (titulo: string, mensaje: string) => {
    setAviso({ titulo, mensaje });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => undefined
    );
  };

  const iniciarSesion = async () => {
    const emailLimpio = email.trim();

    if (!emailLimpio || !password) {
      mostrarAvisoError(
        'Campos incompletos',
        'Ingresá tu correo electrónico y contraseña.'
      );
      return;
    }

    try {
      setLoading(true);

      const data = await authService.login(
        emailLimpio,
        password
      );

      clearSession();

      console.log(
        'Usuario autenticado:',
        data.user?.email
      );

      router.replace('/(app)/home');

    } catch (error: unknown) {
      console.log('Error de login:', error);

      let mensaje =
        'No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.';

      if (
        error instanceof Error &&
        error.message
          ?.toLowerCase()
          .includes('invalid login credentials')
      ) {
        mensaje =
          'Correo electrónico o contraseña incorrectos.';
      }

      mostrarAvisoError(
        'No se pudo iniciar sesión',
        mensaje
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/fondo.jpeg')}
      resizeMode="cover"
      blurRadius={2}
      className="flex-1"
    >
      {/* Capa para diferenciar el login del splash */}
      <View className="absolute inset-0 bg-orange-800/35" />

      <SafeAreaView className="flex-1">

        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
          className="flex-1"
        >

          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            <View className="px-7 py-8">

              {/* LOGO */}
              <View className="items-center mb-7">

                <Image
                  source={require('../../../assets/images/logo.png')}
                  resizeMode="contain"
                  style={{
                    width: 210,
                    height: 210,
                  }}
                />

                <Text className="text-yellow-100 text-xl text-center mt-2 font-medium">
                  Deja de buscar, la mejor comida mexicana está acá
                </Text>

              </View>

              {/* EMAIL */}
              <View className="mb-5">

                <Text className="text-yellow-50 text-lg font-bold mb-2">
                  Correo electrónico
                </Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Escribe tu correo"
                  placeholderTextColor="#F4C9AD"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  className="
                    h-16
                    px-5
                    rounded-2xl
                    border-2
                    border-orange-100/70
                    bg-orange-950/55
                    text-yellow-50
                    text-xl
                    font-semibold
                  "
                />

              </View>

              {/* CONTRASEÑA */}
              <View className="mb-7">

                <View className="flex-row items-center justify-between mb-2">

                  <Text className="text-yellow-50 text-lg font-bold">
                    Contraseña
                  </Text>

                  <Pressable
                    disabled={loading}
                    onPress={() =>
                      router.push(
                        '/(auth)/recuperar-contraseña'
                      )
                    }
                  >

                    <Text className="text-yellow-50 text-base font-bold underline">
                      ¿Olvidaste tu contraseña?
                    </Text>

                  </Pressable>

                </View>

                <View
                  className="
                    h-16
                    flex-row
                    items-center
                    rounded-2xl
                    border-2
                    border-orange-100/70
                    bg-orange-950/55
                  "
                >

                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Escribe tu contraseña"
                    placeholderTextColor="#F4C9AD"
                    secureTextEntry={!mostrarPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    className="
                      flex-1
                      h-full
                      px-5
                      text-yellow-50
                      text-xl
                      font-semibold
                    "
                  />

                  <Pressable
                    onPress={() =>
                      setMostrarPassword(
                        (prev) => !prev
                      )
                    }
                    disabled={loading}
                    className="
                      px-5
                      h-full
                      items-center
                      justify-center
                    "
                  >

                    <Ionicons
                      name={
                        mostrarPassword
                          ? 'eye-outline'
                          : 'eye-off-outline'
                      }
                      size={28}
                      color="#FFE4C7"
                    />

                  </Pressable>

                </View>

              </View>

              {/* LOGIN */}
              <Pressable
                onPress={iniciarSesion}
                disabled={loading}
                className={`
                  h-16
                  rounded-2xl
                  items-center
                  justify-center
                  bg-red-900
                  shadow-lg
                  ${
                    loading
                      ? 'opacity-60'
                      : 'opacity-100'
                  }
                `}
              >

                <Text className="text-white text-xl font-extrabold">
                  {
                    loading
                      ? 'Ingresando...'
                      : 'Iniciar sesión'
                  }
                </Text>

              </Pressable>

              {/* SEPARADOR */}
              <View className="flex-row items-center my-7">

                <View className="flex-1 h-[1px] bg-yellow-100/50" />

                <Text className="mx-4 text-yellow-50 text-lg font-bold">
                  o
                </Text>

                <View className="flex-1 h-[1px] bg-yellow-100/50" />

              </View>

              {/* REGISTRO */}
              <Pressable
                disabled={loading}
                onPress={() =>
                  router.push('/(auth)/registro')
                }
                className="
                  h-16
                  rounded-2xl
                  border-2
                  border-orange-100/40
                  bg-red-900/70
                  items-center
                  justify-center
                  mb-4
                "
              >

                <Text className="text-white text-xl font-bold">
                  Registrarse
                </Text>

              </Pressable>

              {/* INVITADO */}
              <Pressable
                disabled={loading}
                onPress={() => {
                  enterGuest();
                  router.push('/cliente-anonimo/escanear');
                }}
                className="
                  h-16
                  rounded-2xl
                  border-2
                  border-orange-100/40
                  bg-red-900/70
                  items-center
                  justify-center
                  mb-4
                "
              >

                <Text className="text-white text-xl font-bold">
                  Ingresar como invitado
                </Text>

              </Pressable>

              {/* ACCESO RÁPIDO */}
              <Pressable
                disabled={loading}
                onPress={() =>
                  setAccesoRapidoVisible(true)
                }
                className="
                  h-16
                  rounded-2xl
                  border-2
                  border-orange-100/40
                  bg-red-900/70
                  items-center
                  justify-center
                "
              >

                <Text className="text-white text-xl font-bold">
                  Acceso rápido
                </Text>

              </Pressable>

            </View>

          </ScrollView>

        </KeyboardAvoidingView>

      </SafeAreaView>

      {/* MODAL DE ACCESO RÁPIDO */}
      <AccesoRapidoModal
        visible={accesoRapidoVisible}
        onClose={() =>
          setAccesoRapidoVisible(false)
        }
      />

      <Modal
        visible={aviso !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAviso(null)}
      >
        <View className="flex-1 items-center justify-center bg-orange-800/70 px-7">
          <View className="w-full rounded-2xl border-2 border-orange-100/70 bg-red-900 px-6 py-7">
            <Text className="text-center text-xl font-extrabold text-yellow-50">
              {aviso?.titulo}
            </Text>

            <Text className="mt-4 text-center text-lg font-medium text-yellow-100">
              {aviso?.mensaje}
            </Text>

            <Pressable
              onPress={() => setAviso(null)}
              className="mt-7 h-14 items-center justify-center rounded-2xl border-2 border-orange-100/40 bg-red-900/70"
            >
              <Text className="text-lg font-bold text-yellow-50">
                Entendido
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={loading}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <View className="flex-1 items-center justify-center bg-orange-800/70 px-7">
          <View className="w-full items-center rounded-2xl border-2 border-orange-100/70 bg-red-900 px-6 py-7">
            <Image
              source={require('../../../assets/images/logo.png')}
              resizeMode="contain"
              style={{ width: 120, height: 120 }}
            />

            <ActivityIndicator
              size="large"
              color="#FFE4C7"
              className="mt-4"
            />

            <Text className="mt-5 text-center text-lg font-bold text-yellow-50">
              Iniciando sesión...
            </Text>
          </View>
        </View>
      </Modal>

    </ImageBackground>
  );
}
