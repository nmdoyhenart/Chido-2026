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
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { authService } from '../../services/auth.service';

export default function RegistroScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Errores por campo
  const [nombreError, setNombreError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmarPasswordError, setConfirmarPasswordError] = useState('');

  // Error general de Supabase / conexión
  const [registroError, setRegistroError] = useState('');

  const emailEsValido = (emailValue: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  };

  const registrarse = async () => {
    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim().toLowerCase();

    // Limpiamos errores anteriores
    setNombreError('');
    setEmailError('');
    setPasswordError('');
    setConfirmarPasswordError('');
    setRegistroError('');

    let hayErrores = false;

    // NOMBRE
    if (!nombreLimpio) {
      setNombreError('Ingresá tu nombre y apellido.');
      hayErrores = true;
    }

    // EMAIL
    if (!emailLimpio) {
      setEmailError('Ingresá tu correo electrónico.');
      hayErrores = true;
    } else if (!emailEsValido(emailLimpio)) {
      setEmailError('Ingresá un correo electrónico válido.');
      hayErrores = true;
    }

    // PASSWORD
    if (!password) {
      setPasswordError('Ingresá una contraseña.');
      hayErrores = true;
    } else if (password.length < 6) {
      setPasswordError(
        'La contraseña debe tener al menos 6 caracteres.'
      );
      hayErrores = true;
    }

    // CONFIRMAR PASSWORD
    if (!confirmarPassword) {
      setConfirmarPasswordError(
        'Repetí tu contraseña.'
      );
      hayErrores = true;
    } else if (password !== confirmarPassword) {
      setConfirmarPasswordError(
        'Las contraseñas no coinciden.'
      );
      hayErrores = true;
    }

    if (hayErrores) {
      return;
    }

    try {
      setLoading(true);

      // TEMPORAL:
      // nos permite ver exactamente qué email se manda.
      console.log(
        'EMAIL QUE SE ENVÍA A SUPABASE:',
        JSON.stringify(emailLimpio)
      );

      const data = await authService.register(
        nombreLimpio,
        emailLimpio,
        password
      );

      console.log(
        'Usuario creado:',
        data.user?.email
      );

      // Si Supabase crea sesión inmediatamente
      if (data.session) {
        router.replace('/(app)/home');
        return;
      }

      // Si Supabase requiere confirmación por email
      Alert.alert(
        'Cuenta creada',
        'Revisá tu correo para confirmar la cuenta antes de iniciar sesión.',
        [
          {
            text: 'Aceptar',
            onPress: () =>
              router.replace('/(auth)/login'),
          },
        ]
      );

    } catch (error: any) {
      console.log('Error de registro:', error);

      const mensajeError =
        error?.message?.toLowerCase() ?? '';

      /*
       * EMAIL INVÁLIDO SEGÚN SUPABASE
       */
      if (
        mensajeError.includes('email address') &&
        mensajeError.includes('invalid')
      ) {
        setEmailError(
          'El correo electrónico ingresado no es válido.'
        );
        return;
      }

      /*
       * USUARIO YA EXISTENTE
       */
      if (
        mensajeError.includes('already registered') ||
        mensajeError.includes('already been registered')
      ) {
        setEmailError(
          'Ya existe una cuenta con este correo.'
        );
        return;
      }

      /*
       * ERROR RELACIONADO CON PASSWORD
       */
      if (mensajeError.includes('password')) {
        setPasswordError(
          error?.message ??
          'La contraseña no cumple los requisitos.'
        );
        return;
      }

      /*
       * ERROR GENERAL
       */
      setRegistroError(
        'No pudimos crear la cuenta. Intentá nuevamente.'
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

      {/* Capa oscura sobre el fondo */}
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
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
            }}
          >

            <View className="px-7 py-8">

              {/* CABECERA */}
              <View className="items-center mb-7">

                <Image
                  source={require('../../../assets/images/logo.png')}
                  resizeMode="contain"
                  style={{
                    width: 170,
                    height: 170,
                  }}
                />

                <Text className="text-white text-4xl font-extrabold mt-2">
                  Crear cuenta
                </Text>

                <Text className="text-yellow-100 text-lg text-center mt-2">
                  Registrate para formar parte de Chido 🌮
                </Text>

              </View>

              {/* NOMBRE */}
              <View className="mb-5">

                <Text className="text-yellow-50 text-lg font-bold mb-2">
                  Nombre y apellido
                </Text>

                <TextInput
                  value={nombre}
                  onChangeText={(value) => {
                    setNombre(value);

                    if (nombreError) {
                      setNombreError('');
                    }

                    if (registroError) {
                      setRegistroError('');
                    }
                  }}
                  placeholder="Escribí tu nombre"
                  placeholderTextColor="#F4C9AD"
                  editable={!loading}
                  className={`
                    h-16
                    px-5
                    rounded-2xl
                    border-2
                    bg-orange-950/55
                    text-yellow-50
                    text-xl
                    ${
                      nombreError
                        ? 'border-red-400'
                        : 'border-orange-100/70'
                    }
                  `}
                />

                {nombreError ? (
                  <Text className="text-red-200 mt-2 font-semibold">
                    {nombreError}
                  </Text>
                ) : null}

              </View>

              {/* EMAIL */}
              <View className="mb-5">

                <Text className="text-yellow-50 text-lg font-bold mb-2">
                  Correo electrónico
                </Text>

                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);

                    if (emailError) {
                      setEmailError('');
                    }

                    if (registroError) {
                      setRegistroError('');
                    }
                  }}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#F4C9AD"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  className={`
                    h-16
                    px-5
                    rounded-2xl
                    border-2
                    bg-orange-950/55
                    text-yellow-50
                    text-xl
                    ${
                      emailError
                        ? 'border-red-400'
                        : 'border-orange-100/70'
                    }
                  `}
                />

                {emailError ? (
                  <Text className="text-red-200 mt-2 font-semibold">
                    {emailError}
                  </Text>
                ) : null}

              </View>

              {/* PASSWORD */}
              <View className="mb-5">

                <Text className="text-yellow-50 text-lg font-bold mb-2">
                  Contraseña
                </Text>

                <View
                  className={`
                    h-16
                    flex-row
                    items-center
                    rounded-2xl
                    border-2
                    bg-orange-950/55
                    ${
                      passwordError
                        ? 'border-red-400'
                        : 'border-orange-100/70'
                    }
                  `}
                >

                  <TextInput
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);

                      if (passwordError) {
                        setPasswordError('');
                      }

                      if (confirmarPasswordError) {
                        setConfirmarPasswordError('');
                      }

                      if (registroError) {
                        setRegistroError('');
                      }
                    }}
                    placeholder="Mínimo 6 caracteres"
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

                {passwordError ? (
                  <Text className="text-red-200 mt-2 font-semibold">
                    {passwordError}
                  </Text>
                ) : null}

              </View>

              {/* CONFIRMAR PASSWORD */}
              <View className="mb-7">

                <Text className="text-yellow-50 text-lg font-bold mb-2">
                  Confirmar contraseña
                </Text>

                <TextInput
                  value={confirmarPassword}
                  onChangeText={(value) => {
                    setConfirmarPassword(value);

                    if (confirmarPasswordError) {
                      setConfirmarPasswordError('');
                    }

                    if (registroError) {
                      setRegistroError('');
                    }
                  }}
                  placeholder="Repetí tu contraseña"
                  placeholderTextColor="#F4C9AD"
                  secureTextEntry={!mostrarPassword}
                  autoCapitalize="none"
                  editable={!loading}
                  className={`
                    h-16
                    px-5
                    rounded-2xl
                    border-2
                    bg-orange-950/55
                    text-yellow-50
                    text-xl
                    ${
                      confirmarPasswordError
                        ? 'border-red-400'
                        : 'border-orange-100/70'
                    }
                  `}
                />

                {confirmarPasswordError ? (
                  <Text className="text-red-200 mt-2 font-semibold">
                    {confirmarPasswordError}
                  </Text>
                ) : null}

              </View>

              {/* ERROR GENERAL */}
              {registroError ? (
                <View
                  className="
                    bg-red-950/60
                    border
                    border-red-300/40
                    rounded-xl
                    p-4
                    mb-5
                  "
                >

                  <Text className="text-red-100 text-center font-semibold">
                    {registroError}
                  </Text>

                </View>
              ) : null}

              {/* BOTÓN REGISTRO */}
              <Pressable
                onPress={registrarse}
                disabled={loading}
                className={`
                  h-16
                  rounded-2xl
                  items-center
                  justify-center
                  bg-red-900
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
                      ? 'Creando cuenta...'
                      : 'Registrarme'
                  }
                </Text>

              </Pressable>

              {/* VOLVER A LOGIN */}
              <Pressable
                disabled={loading}
                onPress={() =>
                  router.replace('/(auth)/login')
                }
                className="mt-6"
              >

                <Text className="text-yellow-100 text-lg text-center">
                  ¿Ya tenés una cuenta?{' '}

                  <Text className="font-bold underline">
                    Iniciar sesión
                  </Text>

                </Text>

              </Pressable>

            </View>

          </ScrollView>

        </KeyboardAvoidingView>

      </SafeAreaView>

    </ImageBackground>
  );
}