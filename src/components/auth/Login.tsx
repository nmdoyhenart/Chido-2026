import React, { useEffect, useMemo, useRef, useState } from 'react';

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
  Modal,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ErrorAcceso } from '../../services/auth.service';
import { useAppSession } from '../../contexts/AppSessionContext';
import ChidoLoader from '../ui/ChidoLoader';
import { validarCorreo } from '../../../shared/registro-cliente';
import AccesoRapidoModal from './AccesoRapidoModal';
import { colores } from '../../theme/colores';
import { useCampoVisibleConTeclado } from '../../hooks/useCampoVisibleConTeclado';

export default function Login() {
  const router = useRouter();
  const { iniciarSesion: autenticar, enterGuest, mode, role, cargando, avisoSesion, limpiarAviso } = useAppSession();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const operacion = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const { alDesplazar, alEnfocar, rellenoInferior } = useCampoVisibleConTeclado(scroll);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Incluye los accesos de cliente y de demostración para que entren sin scroll.
  const ALTO_DISENO = 1000;
  const altoDisponible = height - insets.top - insets.bottom;
  const escala = Math.min(1, altoDisponible / ALTO_DISENO);

  useEffect(() => {
    if (mode === 'authenticated' && !cargando) {
      if (role === 'supervisor') {
        router.replace('/supervisor/home');
      } else if (role === 'metre') {
        router.replace('/metre/home');
      } else {
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
  const [avisoClienteAnonimoVisible, setAvisoClienteAnonimoVisible] = useState(false);
  const gestoVolverClienteAnonimo = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_evento, gesto) =>
      gesto.x0 <= 32 && gesto.dx > 18 && Math.abs(gesto.dx) > Math.abs(gesto.dy),
    onPanResponderRelease: (_evento, gesto) => {
      if (gesto.dx > 70) setAvisoClienteAnonimoVisible(false);
    },
  }), []);

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

  const ingresarComoClienteAnonimo = async () => {
    if (operacion.current || loading) return;
    operacion.current = true;
    setLoading(true);
    setMensaje(null);
    limpiarAviso();
    try {
      await enterGuest();
      setAvisoClienteAnonimoVisible(false);
      router.push('/cliente-anonimo/alta');
    } catch {
      setAvisoClienteAnonimoVisible(false);
      setMensaje('No se pudo iniciar el acceso de cliente. Revisá la conexión e intentá nuevamente.');
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
              : 'height'
          }
          className="flex-1"
        >

          <ScrollView
            ref={scroll}
            scrollEnabled={rellenoInferior > 0}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingHorizontal: 28 * escala,
              paddingTop: 20 * escala,
              paddingBottom: 20 * escala + rellenoInferior,
            }}
            keyboardShouldPersistTaps="handled"
            onScroll={alDesplazar}
            scrollEventThrottle={16}
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
                  onFocus={alEnfocar}
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
                    onFocus={alEnfocar}
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

              {/* ACCESO PROPIO DEL CLIENTE ANÓNIMO */}
              <TouchableOpacity
                disabled={loading}
                onPress={() => setAvisoClienteAnonimoVisible(true)}
                accessibilityRole="button"
                accessibilityState={{ disabled: loading, busy: loading }}
                activeOpacity={0.85}
                style={[styles.boton, { minHeight: 64 * escala, paddingVertical: 16 * escala, paddingHorizontal: 20 * escala, borderRadius: 16 * escala, marginBottom: 16 * escala }, styles.accesoRapido, loading && styles.deshabilitado]}
              >
                <Text style={[styles.textoClaro, { fontSize: 20 * escala, lineHeight: 26 * escala }]}>
                  Cliente anónimo
                </Text>
              </TouchableOpacity>

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

      <Modal
        visible={avisoClienteAnonimoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvisoClienteAnonimoVisible(false)}
      >
        <View style={styles.fondoModal} {...gestoVolverClienteAnonimo.panHandlers}>
          <View style={styles.modalClienteAnonimo} accessibilityViewIsModal>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={() => setAvisoClienteAnonimoVisible(false)}
              style={styles.botonVolverModal}
              hitSlop={10}
            >
              <Ionicons name="close" size={24} color={colores.textoSobreOscuro} />
            </Pressable>
            <View style={styles.iconoBeneficios}>
              <Ionicons name="gift-outline" size={34} color={colores.textoSobreOscuro} />
            </View>
            <Text style={styles.tituloModal}>¡Registrate y disfrutá de más beneficios!</Text>
            <Text style={styles.descripcionModal}>
              ¡¡Al registrarte podés acceder a signficativos descuentos!!
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={() => {
                setAvisoClienteAnonimoVisible(false);
                router.push('/(auth)/registro');
              }}
              style={styles.botonModalPrincipal}
            >
              <Text style={styles.textoBotonModal}>Registrarme</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={() => void ingresarComoClienteAnonimo()}
              style={styles.botonModalSecundario}
            >
              <Text style={styles.textoBotonModal}>Continuar como Cliente Anónimo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  fondoModal: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(42,20,12,0.78)' },
  modalClienteAnonimo: { width: '100%', maxWidth: 480, alignItems: 'center', borderRadius: 28, borderWidth: 2, borderColor: colores.bordeNaranja, padding: 24, backgroundColor: colores.cabecera },
  botonVolverModal: { position: 'absolute', top: 12, right: 12, zIndex: 1, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colores.acento },
  iconoBeneficios: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: colores.acento },
  tituloModal: { color: colores.textoSobreOscuro, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  descripcionModal: { color: colores.textoSecundarioSobreOscuro, fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  botonModalPrincipal: { width: '100%', minHeight: 54, justifyContent: 'center', alignItems: 'center', borderRadius: 16, borderWidth: 2, borderColor: colores.bordeError, paddingHorizontal: 14, backgroundColor: colores.botonPrincipal },
  botonModalSecundario: { width: '100%', minHeight: 54, justifyContent: 'center', alignItems: 'center', borderRadius: 16, borderWidth: 2, borderColor: colores.bordeNaranja, paddingHorizontal: 14, marginTop: 12, backgroundColor: colores.acento },
  textoBotonModal: { color: colores.textoSobreOscuro, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  textoClaro: { color: colores.textoSobreOscuro, fontWeight: '800', textAlign: 'center' },
  deshabilitado: { opacity: 0.55 },
});
