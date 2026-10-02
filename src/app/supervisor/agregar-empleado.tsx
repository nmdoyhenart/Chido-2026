import { useAppSession } from '../../contexts/AppSessionContext';
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, Modal, StyleSheet, Keyboard, Platform, Pressable } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
          <ScrollView ref={scroll} className="flex-1 p-5" contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 + rellenoInferior }} keyboardShouldPersistTaps="handled" onScroll={alDesplazar} scrollEventThrottle={16}>
            {/* Top bar with back button and title */}
            <View className="flex-row items-center mb-8 relative">
              <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-chido-acento items-center justify-center absolute left-0 z-10"
            >
              <Ionicons name="arrow-back" size={20} color={colores.textoSobreOscuro} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-chido-texto-sobre-oscuro text-center flex-1">Alta de empleado</Text>
          </View>

          <Pressable className="mb-6 items-center" onPress={() => {
            if (!permission?.granted) requestPermission();
            else setTakingPhoto(true);
          }}>
            <View className="h-32 w-32 overflow-hidden rounded-full border-2 border-dashed border-chido-texto-secundario-alternativo bg-chido-acento items-center justify-center">
              {formData.fotoUri ? (
                <Image source={{uri: formData.fotoUri}} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Ionicons name="person-outline" size={40} color={colores.textoSobreOscuro} />
              )}
            </View>
            <View className="mt-3 min-h-12 flex-row items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento px-5 py-2">
              <Ionicons name="camera-outline" size={22} color={colores.textoSobreOscuro} />
              <Text className="ml-2 text-base font-bold text-chido-texto-sobre-oscuro">
                {formData.fotoUri ? "Volver a tomar la foto" : "Tomar foto de empleado"}
              </Text>
            </View>
            {errors.fotoBase64 && <Text className="text-chido-error text-sm mt-2">{errors.fotoBase64}</Text>}
          </Pressable>

          {/* Scan DNI Button */}
          <TouchableOpacity
            className="flex-row justify-center items-center p-4 rounded-xl mb-3 border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera"
            disabled={guardando}
            accessibilityRole="button"
            onPress={() => { Keyboard.dismiss(); setScanningDni(true); }}
          >
            <Ionicons name="scan-outline" size={28} color={colores.textoSobreOscuro} className="mr-2" />
            <Text className="text-chido-texto-sobre-oscuro font-bold text-lg ml-2">Leer DNI con la cámara</Text>
          </TouchableOpacity>

          <Text className="text-chido-texto-secundario-sobre-oscuro text-base mb-5" accessibilityLiveRegion="polite">
            {avisoDni ? 'Datos del DNI cargados. Revisalos antes de continuar.' : 'La lectura del DNI es opcional. También podés escribir los datos.'}
          </Text>

          {/* Form Fields */}
          <View className="flex-row gap-4">
            <Input 
              label="Nombres"
              placeholder="Ej. María José"
              value={formData.nombres}
              onChangeText={(t) => setFormData(prev => ({...prev, nombres: formatName(t)}))}
              onFocus={alEnfocar}
              error={errors.nombres}
              containerClassName="flex-1"
            />
            <Input 
              label="Apellidos"
              placeholder="Ej. González"
              value={formData.apellidos}
              onChangeText={(t) => setFormData(prev => ({...prev, apellidos: formatName(t)}))}
              onFocus={alEnfocar}
              error={errors.apellidos}
              containerClassName="flex-1"
            />
          </View>

          <Input 
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
            label="CUIL"
            placeholder="Ej. 20-34567890-3"
            value={formData.cuil}
            keyboardType="numeric"
            onChangeText={(t) => setFormData(prev => ({...prev, cuil: formatCuil(t)}))}
            onFocus={alEnfocar}
            error={errors.cuil}
          />

          <Input 
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
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            value={formData.password}
            secureTextEntry
            onChangeText={(t) => setFormData(prev => ({...prev, password: t}))}
            onFocus={alEnfocar}
            error={errors.password}
          />

          {/* Perfil Selector */}
          <View className="mb-6">
            <Text className="text-chido-texto-sobre-oscuro font-bold text-base mb-2">Perfil</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {['supervisor', 'metre', 'mozo', 'cocinero', 'cantinero'].map((rol) => (
                <TouchableOpacity
                  key={rol}
                  onPress={() => setFormData(prev => ({...prev, perfil: rol}))}
                  className={`px-4 py-3 rounded-xl mr-2 border ${
                    formData.perfil === rol
                      ? 'border-chido-texto-secundario-alternativo bg-chido-cabecera'
                      : 'border-chido-texto-boton-outline bg-chido-acento'
                  }`}
                >
                  <Text
                    className={`font-bold text-chido-texto-sobre-oscuro text-center text-base`}
                  >
                    {rol.charAt(0).toUpperCase() + rol.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Guardar */}
          {!!errorRegistro && <View className="bg-chido-cabecera rounded-xl p-4 mb-3" accessibilityLiveRegion="assertive"><Text className="text-chido-texto-sobre-oscuro text-base">{errorRegistro}</Text></View>}
          <PrimaryButton 
            title="Guardar Empleado"
            onPress={handleSubmit}
            className="mt-4 mb-12"
            isLoading={guardando}
          />
        </KeyboardAwareScrollView>
        </View>
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
