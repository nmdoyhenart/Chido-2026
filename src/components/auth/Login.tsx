import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ImageBackground,
  Keyboard,
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
import { ENTRADA_APP } from '../../utils/inicioPorPerfil';

export default function Login() {
  const router = useRouter();
  const { iniciarSesion: autenticar, mode, role, cargando, avisoSesion, limpiarAviso } = useAppSession();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const operacion = useRef(false);
  const [tecladoVisible, setTecladoVisible] = useState(false);
  const [altoDisponible, setAltoDisponible] = useState(0);
  const [altoContenidoBase, setAltoContenidoBase] = useState(0);
  const escala = altoDisponible > 0 && altoContenidoBase > 0
    ? Math.min(1, altoDisponible / altoContenidoBase)
    : 1;

  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', () => setTecladoVisible(true));
    const ocultar = Keyboard.addListener('keyboardDidHide', () => setTecladoVisible(false));
    return () => { mostrar.remove(); ocultar.remove(); };
  }, []);

  useEffect(() => {
    if (mode === 'authenticated' && !cargando) {
      if (role === 'supervisor') {
        router.replace('/supervisor/home');
      } 
      if (role === 'metre') {
        router.replace('/metre/home');
      }else {
        router.replace('/(app)/home');
      }
    }
  }, [mode, role, cargando, router]);

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
      
      // La redirección ocurrirá automáticamente por el useEffect de arriba al cambiar mode/role

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
          onLayout={(evento) => setAltoDisponible(evento.nativeEvent.layout.height)}
        >

          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingHorizontal: 28 * escala,
              paddingVertical: 20 * escala,
            }}
            scrollEnabled={tecladoVisible}
            onContentSizeChange={(_, alto) => {
              const nuevoAltoBase = alto / escala;
              setAltoContenidoBase((anterior) => Math.abs(anterior - nuevoAltoBase) > 1 ? nuevoAltoBase : anterior);
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            <View>

              {/* LOGO */}
              <View className="items-center" style={{ marginBottom: 28 * escala }}>

                <Image
                  source={require('../../../assets/images/logo.png')}
                  resizeMode="contain"
                  style={{
                    width: 210 * escala,
                    height: 210 * escala,
                  }}
                />

                <Text className="text-chido-texto-secundario-sobre-oscuro text-center font-medium" style={{ fontSize: 20 * escala, lineHeight: 26 * escala, marginTop: 8 * escala }}>
                  Deja de buscar, la mejor comida mexicana está acá
                </Text>

              </View>

              {/* EMAIL */}
              <View style={{ marginBottom: 20 * escala }}>

                <Text className="text-chido-texto-sobre-oscuro font-bold" style={{ fontSize: 18 * escala, marginBottom: 8 * escala }}>
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
                  className="rounded-2xl border-2 border-chido-texto-secundario-alternativo/70 bg-chido-cabecera/55 text-chido-texto-sobre-oscuro font-semibold"
                  style={{ height: 64 * escala, paddingHorizontal: 20 * escala, fontSize: 20 * escala, borderRadius: 16 * escala }}
                />

              </View>

              {/* CONTRASEÑA */}
              <View style={{ marginBottom: 28 * escala }}>

                <View className="flex-row items-center justify-between" style={{ marginBottom: 8 * escala }}>

                  <Text className="text-chido-texto-sobre-oscuro font-bold" style={{ fontSize: 18 * escala }}>
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

                    <Text className="text-chido-texto-sobre-oscuro font-bold underline" style={{ fontSize: 16 * escala }}>
                      ¿Olvidaste tu contraseña?
                    </Text>

                  </Pressable>

                </View>

                <View
                  className="flex-row items-center rounded-2xl border-2 border-chido-texto-secundario-alternativo/70 bg-chido-cabecera/55"
                  style={{ height: 64 * escala, borderRadius: 16 * escala }}
                >

                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Escribe tu contraseña"
                    placeholderTextColor={colores.textoSecundarioAlternativo}
                    secureTextEntry={!mostrarPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    className="flex-1 h-full text-chido-texto-sobre-oscuro font-semibold"
                    style={{ paddingHorizontal: 20 * escala, fontSize: 20 * escala }}
                  />

                  <Pressable
                    onPress={() =>
                      setMostrarPassword(
                        (prev) => !prev
                      )
                    }
                    disabled={loading}
                    className="h-full items-center justify-center"
                    style={{ paddingHorizontal: 20 * escala }}
                  >

                    <Ionicons
                      name={
                        mostrarPassword
                          ? 'eye-outline'
                          : 'eye-off-outline'
                      }
                      size={28 * escala}
                      color={colores.textoSecundarioAlternativo}
                    />

                  </Pressable>

                </View>

              </View>

              {/* LOGIN */}
              {(mensaje || avisoSesion) && <View className="bg-chido-error rounded-xl p-4 mb-5" accessibilityLiveRegion="assertive"><Text className="text-chido-texto-sobre-oscuro" style={{ fontSize: 18 * escala }}>{mensaje || avisoSesion}</Text></View>}
              {loading && <ChidoLoader mensaje="Verificando acceso…" />}
              <TouchableOpacity
                onPress={iniciarSesion}
                disabled={loading}
                accessibilityRole="button"
                accessibilityState={{ disabled: loading, busy: loading }}
                activeOpacity={0.85}
                style={[styles.boton, { minHeight: 64 * escala, paddingVertical: 16 * escala, paddingHorizontal: 20 * escala, borderRadius: 16 * escala }, styles.iniciarSesion, loading && styles.deshabilitado]}
              >

                <Text style={[styles.textoClaro, { fontSize: 20 * escala, lineHeight: 26 * escala }]}>
                  {
                    loading
                      ? 'Ingresando...'
                      : 'Iniciar sesión'
                  }
                </Text>

              </TouchableOpacity>

              {/* SEPARADOR */}
              <View className="flex-row items-center" style={{ marginVertical: 28 * escala }}>

                <View className="flex-1 h-[1px] bg-chido-texto-secundario-alternativo/50" />

                <Text className="text-chido-texto-sobre-oscuro font-bold" style={{ marginHorizontal: 16 * escala, fontSize: 18 * escala }}>
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
                style={[styles.boton, { minHeight: 64 * escala, paddingVertical: 16 * escala, paddingHorizontal: 20 * escala, borderRadius: 16 * escala, marginBottom: 16 * escala }, styles.registrarse, loading && styles.deshabilitado]}
              >

                <Text style={[styles.textoClaro, { fontSize: 20 * escala, lineHeight: 26 * escala }]}>
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
                style={[styles.boton, { minHeight: 64 * escala, paddingVertical: 16 * escala, paddingHorizontal: 20 * escala, borderRadius: 16 * escala }, styles.accesoRapido, loading && styles.deshabilitado]}
              >

                <Text style={[styles.textoClaro, { fontSize: 20 * escala, lineHeight: 26 * escala }]}>
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
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciarSesion: { backgroundColor: colores.botonPrincipal, borderColor: '#ffb3ae' },
  registrarse: { backgroundColor: colores.botonPrincipal, borderColor: '#ffb3ae' },
  accesoRapido: { backgroundColor: colores.botonPrincipal, borderColor: '#ffb3ae' },
  textoClaro: { color: colores.textoSobreOscuro, fontWeight: '800', textAlign: 'center' },
  deshabilitado: { opacity: 0.55 },
});
