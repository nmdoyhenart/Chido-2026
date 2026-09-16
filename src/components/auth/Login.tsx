import React, { useEffect, useRef, useState } from 'react';

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
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ErrorAcceso } from '../../services/auth.service';
import { useAppSession } from '../../contexts/AppSessionContext';
import ChidoLoader from '../ui/ChidoLoader';
import { validarCorreo } from '../../../shared/registro-cliente';
import AccesoRapidoModal from './AccesoRapidoModal';
import { colores } from '../../theme/colores';

export default function Login() {
  const router = useRouter();
  const { iniciarSesion: autenticar, mode, cargando, avisoSesion, limpiarAviso } = useAppSession();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const operacion = useRef(false);

  useEffect(() => {
    if (mode === 'authenticated' && !cargando) router.replace('/(app)/home');
  }, [mode, cargando, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Controla si el modal de acceso rápido está abierto o cerrado
  const [accesoRapidoVisible, setAccesoRapidoVisible] = useState(false);

  const iniciarSesion = async () => {
    if (operacion.current) return;
    const emailLimpio = email.trim();

    if (!validarCorreo(emailLimpio) || !password) {
      setMensaje('Ingresá un correo electrónico válido y tu contraseña.');
      Vibration.vibrate(180);
      return;
    }

    try {
      operacion.current = true;
      setLoading(true);
      setMensaje(null);
      limpiarAviso();
      await autenticar(
        emailLimpio,
        password
      );

      router.replace('/(app)/home');

    } catch (error: unknown) {
      setMensaje(error instanceof ErrorAcceso ? error.message : 'No pudimos iniciar sesión. Revisá la conexión e intentá nuevamente.');
      Vibration.vibrate(180);
    } finally {
      operacion.current = false;
      setLoading(false);
    }
  };

  if (cargando && !loading) return <View className="flex-1 bg-chido-fondo justify-center"><ChidoLoader mensaje="Verificando sesión…" /></View>;

  return (
    <ImageBackground
      source={require('../../../assets/images/fondo.jpeg')}
      resizeMode="cover"
      blurRadius={2}
      className="flex-1"
    >
      {/* Capa para diferenciar el login del splash */}
      <View className="absolute inset-0 bg-chido-cabecera/35" />

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

                <Text className="text-chido-texto-secundario-sobre-oscuro text-xl text-center mt-2 font-medium">
                  Deja de buscar, la mejor comida mexicana está acá
                </Text>

              </View>

              {/* EMAIL */}
              <View className="mb-5">

                <Text className="text-chido-texto-sobre-oscuro text-lg font-bold mb-2">
                  Correo electrónico
                </Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Escribe tu correo"
                  placeholderTextColor={colores.textoSecundarioAlternativo}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  className="
                    h-16
                    px-5
                    rounded-2xl
                    border-2
                    border-chido-texto-secundario-alternativo/70
                    bg-chido-cabecera/55
                    text-chido-texto-sobre-oscuro
                    text-xl
                    font-semibold
                  "
                />

              </View>

              {/* CONTRASEÑA */}
              <View className="mb-7">

                <View className="flex-row items-center justify-between mb-2">

                  <Text className="text-chido-texto-sobre-oscuro text-lg font-bold">
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

                    <Text className="text-chido-texto-sobre-oscuro text-base font-bold underline">
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
                    border-chido-texto-secundario-alternativo/70
                    bg-chido-cabecera/55
                  "
                >

                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Escribe tu contraseña"
                    placeholderTextColor={colores.textoSecundarioAlternativo}
                    secureTextEntry={!mostrarPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    className="
                      flex-1
                      h-full
                      px-5
                      text-chido-texto-sobre-oscuro
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
                      color={colores.textoSecundarioAlternativo}
                    />

                  </Pressable>

                </View>

              </View>

              {/* LOGIN */}
              {(mensaje || avisoSesion) && <View className="bg-chido-error rounded-xl p-4 mb-5" accessibilityLiveRegion="assertive"><Text className="text-chido-texto-sobre-oscuro text-lg">{mensaje || avisoSesion}</Text></View>}
              {loading && <ChidoLoader mensaje="Verificando acceso…" />}
              <TouchableOpacity
                onPress={iniciarSesion}
                disabled={loading}
                accessibilityRole="button"
                accessibilityState={{ disabled: loading, busy: loading }}
                activeOpacity={0.85}
                style={[styles.boton, styles.iniciarSesion, loading && styles.deshabilitado]}
              >

                <Text style={styles.textoClaro}>
                  {
                    loading
                      ? 'Ingresando...'
                      : 'Iniciar sesión'
                  }
                </Text>

              </TouchableOpacity>

              {/* SEPARADOR */}
              <View className="flex-row items-center my-7">

                <View className="flex-1 h-[1px] bg-chido-texto-secundario-alternativo/50" />

                <Text className="mx-4 text-chido-texto-sobre-oscuro text-lg font-bold">
                  o
                </Text>

                <View className="flex-1 h-[1px] bg-chido-texto-secundario-alternativo/50" />

              </View>

              {/* REGISTRO */}
              <TouchableOpacity
                disabled={loading}
                onPress={() =>
                  router.push('/(auth)/registro')
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: loading }}
                activeOpacity={0.85}
                style={[styles.boton, styles.registrarse, loading && styles.deshabilitado]}
              >

                <Text style={styles.textoClaro}>
                  Registrarse
                </Text>

              </TouchableOpacity>

              {/* INVITADO */}
              {/* <Pressable
                disabled={loading}
                onPress={ingresarInvitado}
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

              </Pressable> */}

              {/* ACCESO RÁPIDO */}
              <TouchableOpacity
                disabled={loading}
                onPress={() =>
                  setAccesoRapidoVisible(true)
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: loading }}
                activeOpacity={0.85}
                style={[styles.boton, styles.accesoRapido, loading && styles.deshabilitado]}
              >

                <Text style={styles.textoClaro}>
                  Acceso rápido
                </Text>

              </TouchableOpacity>

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

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: 64,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciarSesion: { backgroundColor: colores.botonPrincipal, borderColor: '#ffb3ae' },
  registrarse: { backgroundColor: colores.botonPrincipal, borderColor: '#ffb3ae', marginBottom: 16 },
  accesoRapido: { backgroundColor: colores.botonPrincipal, borderColor: '#ffb3ae' },
  textoClaro: { color: colores.textoSobreOscuro, fontSize: 20, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
  deshabilitado: { opacity: 0.55 },
});
