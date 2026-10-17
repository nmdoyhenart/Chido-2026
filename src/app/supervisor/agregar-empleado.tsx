import { useAppSession } from '../../contexts/AppSessionContext';
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, Modal, StyleSheet, KeyboardAvoidingView, Keyboard, Platform, Pressable } from 'react-native';

import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { crearEmpleado } from '../../services/empleados.service';
import { Input } from '../../components/ui/Input';
import { PrimaryButton } from '../../components/ui/Buttons';
import { Header } from '../../components/Header';
import { colores } from '../../theme/colores';
import { useRestriccionSimulacion } from '../../components/ui/RestriccionSimulacion';
import CamaraRegistro from '../../components/auth/CamaraRegistro';
import { ResultadoModal } from '../../components/ui/ResultadoModal';
import { useCampoVisibleConTeclado } from '../../hooks/useCampoVisibleConTeclado';

const GRUPOS_PERFILES = [['supervisor', 'metre', 'mozo'], ['cocinero', 'cantinero']];

export default function AgregarEmpleado() {
  const { role, usuario, mode } = useAppSession();
  const { bloquear, modal: modalSimulacion } = useRestriccionSimulacion();
  const enviando = useRef(false);
  const capturando = useRef(false);
  const [errorRegistro, setErrorRegistro] = useState('');
  const [avisoRegistro, setAvisoRegistro] = useState<'exito' | 'error' | null>(null);
  const empleadoGuardado = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const { alDesplazar, alEnfocar, rellenoInferior } = useCampoVisibleConTeclado(scroll);

  // Dos pantallas del alto visible: 1) título → lectura del DNI; 2) datos, perfil y Guardar, todo sin scroll.
  // El scroll sólo pasa de una a otra y frena justo al inicio de la segunda.
  // El alto se toma con el teclado cerrado para que nada salte mientras se escribe.
  const [altoVista, setAltoVista] = useState(0);
  const [inicioPantalla2, setInicioPantalla2] = useState(0);
  const altoFoto = altoVista > 0 ? Math.max(128, Math.min(220, Math.floor(altoVista * 0.3))) : 128;
  // Para que todo entre se achica la altura de los inputs (40–60 px), nunca la letra.
  // 322 ≈ etiquetas de los 6 campos + Perfil + Guardar + separaciones mínimas.
  const altoInput = altoVista > 0 ? Math.max(40, Math.min(60, Math.floor((altoVista - 322) / 6))) : undefined;
  const estiloInput = altoInput ? { height: altoInput, paddingVertical: 4 } : undefined;

  // Selector de perfil en dos grupos fijos (sin scroll, nada cortado):
  // 1) Supervisor, Metre, Mozo + flecha adelante; 2) flecha atrás + Cocinero, Cantinero.
  const [grupoPerfiles, setGrupoPerfiles] = useState(0);

  const mostrarErrorRegistro = (mensaje: string) => {
    Keyboard.dismiss();
    setErrorRegistro(mensaje);
    setAvisoRegistro('error');
  };
  const userName = usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Supervisor";
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Supervisor";

  const [permission, requestPermission] = useCameraPermissions();
  const [scanningDni, setScanningDni] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    dni: '',
    cuil: '',
    correo: '',
    password: '',
    perfil: 'cocinero',
    fotoBase64: '',
    fotoUri: null as string | null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const cameraRef = useRef<any>(null);

  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [avisoDni, setAvisoDni] = useState(false);

  const formatName = (name: string) => {
    let cleaned = name.replace(/XX/g, 'Ñ').replace(/xx/g, 'ñ');
    cleaned = cleaned.replace(/nñ/gi, 'ñ').replace(/NÑ/g, 'Ñ');
    cleaned = cleaned.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    return cleaned.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatCuil = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    if (cleaned.length > 10) formatted = `${formatted.slice(0, 11)}-${cleaned.slice(10, 11)}`;
    return formatted.slice(0, 13);
  };

  const handleSubmit = async () => {
    if (enviando.current || empleadoGuardado.current || avisoRegistro || bloquear('registrar empleados')) return;
    if (mode !== 'authenticated' || !['dueño', 'supervisor'].includes(role ?? '')) {
      mostrarErrorRegistro('Ingresá con una cuenta de dueño o supervisor para registrar empleados.');
      return;
    }
    enviando.current = true;
    Keyboard.dismiss();
    setGuardando(true);
    setErrorRegistro('');
    setErrors({});
    try {
      const resultado = await crearEmpleado({
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        dni: formData.dni,
        cuil: formData.cuil,
        correo: formData.correo,
        perfil: formData.perfil,
        fotoBase64: formData.fotoBase64,
        password: formData.password
      });

      if (!resultado.ok) {
        if (resultado.campos) setErrors(resultado.campos);
        mostrarErrorRegistro(resultado.mensaje);
        return;
      }

      empleadoGuardado.current = true;
      setAvisoRegistro('exito');
    } catch {
      mostrarErrorRegistro('No se pudo confirmar el alta. Revisá si el empleado se creó antes de volver a enviarlo.');
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || capturando.current) return;
    capturando.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) throw new Error('FOTO_VACIA');
      const contexto = ImageManipulator.manipulate(photo.uri);
      let imagen: Awaited<ReturnType<typeof contexto.renderAsync>> | undefined;
      try {
        if (photo.width > 960 || photo.height > 960) contexto.resize(photo.width >= photo.height ? { width: 960 } : { height: 960 });
        imagen = await contexto.renderAsync();
        const foto = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
        if (!foto.base64) throw new Error('FOTO_VACIA');
        setFormData(prev => ({ ...prev, fotoUri: foto.uri, fotoBase64: foto.base64! }));
      } finally { imagen?.release(); contexto.release(); }
      setTakingPhoto(false);
    } catch { Alert.alert('Foto no disponible', 'No se pudo procesar la foto. Volvé a tomarla.'); }
    finally { capturando.current = false; }
  };

  const toggleCameraFacing = () => {
    setCameraFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View className="flex-1 bg-chido-fondo">
      <Stack.Screen options={{ headerShown: false }} />

      <Header userName={userName} role={displayRole} />

      <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            ref={scroll}
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: rellenoInferior }}
            keyboardShouldPersistTaps="handled"
            onScroll={alDesplazar}
            scrollEventThrottle={16}
            onLayout={({ nativeEvent }) => {
              const alto = Math.round(nativeEvent.layout.height);
              setAltoVista((actual) => (Keyboard.isVisible() || actual === alto ? actual : alto));
            }}
            snapToOffsets={rellenoInferior === 0 && inicioPantalla2 > 0 ? [0, inicioPantalla2] : undefined}
            decelerationRate="fast"
          >
          {/* Pantalla 1: título, foto y lectura del DNI, repartidos en todo el alto visible. */}
          <View style={altoVista > 0 ? { minHeight: altoVista, justifyContent: 'space-evenly', paddingVertical: 12 } : undefined}>
            <View className="flex-row items-center relative">
              <TouchableOpacity
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Volver"
                className="w-12 h-12 rounded-xl bg-chido-acento items-center justify-center absolute left-0 z-10"
              >
                <Ionicons name="arrow-back" size={26} color={colores.textoSobreOscuro} />
              </TouchableOpacity>
              <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro text-center flex-1">Alta de empleado</Text>
            </View>

            <Pressable className="items-center" onPress={() => {
              if (!permission?.granted) requestPermission();
              else setTakingPhoto(true);
            }}>
              <View style={{ width: altoFoto, height: altoFoto, borderRadius: altoFoto / 2 }} className="overflow-hidden border-2 border-dashed border-chido-texto-secundario-alternativo bg-chido-acento items-center justify-center">
                {formData.fotoUri ? (
                  <Image source={{uri: formData.fotoUri}} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <Ionicons name="person-outline" size={Math.round(altoFoto * 0.38)} color={colores.textoSobreOscuro} />
                )}
              </View>
              <View className="mt-4 min-h-16 w-full flex-row items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento px-5 py-3">
                <Ionicons name="camera-outline" size={30} color={colores.textoSobreOscuro} />
                <Text className="ml-3 text-xl font-bold text-chido-texto-sobre-oscuro">
                  {formData.fotoUri ? "Volver a tomar la foto" : "Tomar foto de empleado"}
                </Text>
              </View>
              {errors.fotoBase64 && <Text className="text-chido-error text-base mt-2">{errors.fotoBase64}</Text>}
            </Pressable>

            <View>
              <TouchableOpacity
                className="min-h-16 flex-row justify-center items-center px-4 py-3 rounded-2xl mb-3 border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera"
                disabled={guardando}
                accessibilityRole="button"
                onPress={() => { Keyboard.dismiss(); setScanningDni(true); }}
              >
                <Ionicons name="scan-outline" size={32} color={colores.textoSobreOscuro} />
                <Text className="text-chido-texto-sobre-oscuro font-bold text-xl ml-3">Leer DNI con la cámara</Text>
              </TouchableOpacity>

              <Text className="text-chido-texto-secundario-sobre-oscuro text-lg text-center" accessibilityLiveRegion="polite">
                {avisoDni ? 'Datos del DNI cargados. Revisalos antes de continuar.' : 'La lectura del DNI es opcional. También podés escribir los datos.'}
              </Text>
            </View>
          </View>

          {/* Pantalla 2: datos uno debajo del otro, perfil y guardar; todo entra en el alto visible. */}
          <View
            style={altoVista > 0 ? { minHeight: altoVista, justifyContent: 'space-between', paddingVertical: 8 } : undefined}
            onLayout={({ nativeEvent }) => setInicioPantalla2(Math.round(nativeEvent.layout.y))}
          >
            <Input
              grande
              style={estiloInput}
              label="Nombres"
              placeholder="Ej. María José"
              value={formData.nombres}
              onChangeText={(t) => setFormData(prev => ({...prev, nombres: formatName(t)}))}
              onFocus={alEnfocar}
              error={errors.nombres}
            />
            <Input
              grande
              style={estiloInput}
              label="Apellidos"
              placeholder="Ej. González"
              value={formData.apellidos}
              onChangeText={(t) => setFormData(prev => ({...prev, apellidos: formatName(t)}))}
              onFocus={alEnfocar}
              error={errors.apellidos}
            />
            <Input
              grande
              style={estiloInput}
              label="DNI"
              placeholder="Ej. 34567890"
              value={formData.dni}
              keyboardType="numeric"
              maxLength={8}
              onChangeText={(t) => setFormData(prev => ({...prev, dni: t}))}
              onFocus={alEnfocar}
              error={errors.dni}
            />
            <Input
              grande
              style={estiloInput}
              label="CUIL"
              placeholder="Ej. 20-34567890-3"
              value={formData.cuil}
              keyboardType="numeric"
              onChangeText={(t) => setFormData(prev => ({...prev, cuil: formatCuil(t)}))}
              onFocus={alEnfocar}
              error={errors.cuil}
            />
            <Input
              grande
              style={estiloInput}
              label="Correo electrónico"
              placeholder="empleado@correo.com"
              value={formData.correo}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={(t) => setFormData(prev => ({...prev, correo: t}))}
              onFocus={alEnfocar}
              error={errors.correo}
            />
            <Input
              grande
              style={estiloInput}
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              secureTextEntry
              onChangeText={(t) => setFormData(prev => ({...prev, password: t}))}
              onFocus={alEnfocar}
              error={errors.password}
            />

            {/* Perfil Selector */}
            <View>
              <Text className="text-chido-texto-sobre-oscuro font-bold text-lg mb-1 ml-1" style={{ lineHeight: 22 }}>Perfil</Text>
              {/* Dos grupos fijos: Supervisor, Metre, Mozo + "›"  /  "‹" + Cocinero, Cantinero. */}
              <View className="flex-row items-center gap-2">
                {grupoPerfiles === 1 && (
                  <TouchableOpacity onPress={() => setGrupoPerfiles(0)} accessibilityRole="button" accessibilityLabel="Ver Supervisor, Metre y Mozo" className="h-12 w-11 items-center justify-center rounded-xl bg-chido-acento">
                    <Ionicons name="chevron-back" size={28} color={colores.textoSobreOscuro} />
                  </TouchableOpacity>
                )}
                {GRUPOS_PERFILES[grupoPerfiles].map((rol) => (
                  <TouchableOpacity
                    key={rol}
                    onPress={() => setFormData(prev => ({...prev, perfil: rol}))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: formData.perfil === rol }}
                    className={`flex-1 min-h-12 justify-center px-2 py-2 rounded-xl border-2 ${
                      formData.perfil === rol
                        ? 'border-chido-texto-secundario-alternativo bg-chido-cabecera'
                        : 'border-chido-texto-boton-outline bg-chido-acento'
                    }`}
                  >
                    {/* Si "Supervisor" no entra en el ancho, la letra se ajusta apenas en vez de cortarse. */}
                    <Text
                      className={`font-bold text-chido-texto-sobre-oscuro text-center text-lg`}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {rol.charAt(0).toUpperCase() + rol.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
                {grupoPerfiles === 0 && (
                  <TouchableOpacity onPress={() => setGrupoPerfiles(1)} accessibilityRole="button" accessibilityLabel="Ver Cocinero y Cantinero" className="h-12 w-11 items-center justify-center rounded-xl bg-chido-acento">
                    <Ionicons name="chevron-forward" size={28} color={colores.textoSobreOscuro} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Guardar */}
            {!!errorRegistro && <View className="bg-chido-cabecera rounded-xl p-3" accessibilityLiveRegion="assertive"><Text className="text-chido-texto-sobre-oscuro text-lg">{errorRegistro}</Text></View>}
            <PrimaryButton
              title="Guardar Empleado"
              onPress={handleSubmit}
              className="min-h-14"
              isLoading={guardando}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>

      {scanningDni && <CamaraRegistro
        modo="dni"
        onClose={() => setScanningDni(false)}
        onFoto={() => {}}
        onDni={datos => {
          setFormData(actual => ({ ...actual, ...datos }));
          setErrors(actual => {
            const siguientes = { ...actual };
            delete siguientes.nombres;
            delete siguientes.apellidos;
            delete siguientes.dni;
            return siguientes;
          });
          setAvisoDni(true);
        }}
      />}

      {/* Modal Tomar Foto */}
      <Modal visible={takingPhoto} animationType="slide">
        <View className="flex-1 bg-black">
          {permission?.granted && (
            <CameraView
              style={StyleSheet.absoluteFill}
              ref={cameraRef}
              facing={cameraFacing}
            />
          )}

          {/* Flip Camera Button */}
          <TouchableOpacity
            className="absolute top-12 right-6 bg-black/50 p-3 rounded-full"
            onPress={toggleCameraFacing}
          >
            <Ionicons name="camera-reverse-outline" size={28} color={colores.textoSobreOscuro} />
          </TouchableOpacity>

          <View className="absolute bottom-10 left-0 right-0 flex-row justify-center gap-4">
            <TouchableOpacity className="bg-chido-error px-6 py-4 rounded-full" onPress={() => setTakingPhoto(false)}>
              <Text className="text-chido-texto-sobre-oscuro font-bold text-lg">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-chido-acento px-6 py-4 rounded-full" onPress={takePicture}>
              <Text className="text-chido-texto-sobre-oscuro font-bold text-lg">Capturar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {modalSimulacion}
      <ResultadoModal
        visible={avisoRegistro !== null}
        tipo={avisoRegistro ?? 'error'}
        titulo={avisoRegistro === 'exito' ? 'Empleado registrado' : 'Revisá el registro'}
        mensaje={avisoRegistro === 'exito' ? 'El empleado se guardó correctamente y ya puede ingresar con su correo y contraseña.' : errorRegistro}
        accion={avisoRegistro === 'exito' ? 'Volver al inicio' : 'Volver al formulario'}
        onClose={() => {
          if (avisoRegistro === 'exito') router.back();
          else setAvisoRegistro(null);
        }}
      />
    </View>
  );
}