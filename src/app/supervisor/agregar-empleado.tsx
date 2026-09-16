import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { crearEmpleado } from '../../services/empleados.service';
import { Input } from '../../components/ui/Input';
import { PrimaryButton } from '../../components/ui/Buttons';
import { Header } from '../../components/Header';
import { colores } from '../../theme/colores';
import { useAppSession } from '../../contexts/AppSessionContext';

export default function AgregarEmpleado() {
  const { role, usuario } = useAppSession();
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
  const isScanningDniRef = useRef(false);

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
    setGuardando(true);
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
        Alert.alert("Error", resultado.mensaje);
        return;
      }

      Alert.alert("Éxito", "Empleado guardado correctamente.");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudo guardar el empleado");
    } finally {
      setGuardando(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (isScanningDniRef.current) return;
    isScanningDniRef.current = true;

    setScanningDni(false);
    const parts = data.split('@');
    if (parts.length >= 8) {
      let dniIndex = parts.findIndex(p => p.length === 7 || (p.length === 8 && !isNaN(Number(p))));
      let apellidos = parts[1] || '';
      let nombres = parts[2] || '';
      let dni = parts[dniIndex] || parts[4] || '';

      if (isNaN(Number(parts[4])) && !isNaN(Number(parts[1]))) {
        dni = parts[1];
        apellidos = parts[4];
        nombres = parts[5];
      }

      setFormData(prev => ({
        ...prev,
        apellidos: formatName(apellidos),
        nombres: formatName(nombres),
        dni: dni.replace(/\D/g, '')
      }));
      Alert.alert("DNI escaneado", "Datos cargados correctamente");
    } else {
      Alert.alert("Error", "Formato de DNI no reconocido.");
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });
      // La Edge function usa una firma tipo JPG
      const base64Format = photo.base64 ? `/9j/${photo.base64.substring(0, photo.base64.length).replace(/^\/9j\//, '')}` : '';
      setFormData(prev => ({ ...prev, fotoUri: photo.uri, fotoBase64: base64Format }));
      setTakingPhoto(false);
    }
  };

  const toggleCameraFacing = () => {
    setCameraFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View className="flex-1 bg-chido-fondo">
      <Stack.Screen options={{ headerShown: false }} />

      <Header userName={userName} role={displayRole} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-5">
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

          {/* Camera Button */}
          <View className="items-center mb-6">
            <TouchableOpacity 
              onPress={() => {
                if (!permission?.granted) requestPermission();
                else setTakingPhoto(true);
              }}
              className="w-32 h-32 rounded-full border-2 border-dashed border-chido-texto-secundario-alternativo items-center justify-center mb-2"
            >
              {formData.fotoUri ? (
                <Image source={{uri: formData.fotoUri}} className="w-full h-full rounded-full" />
              ) : (
                <Ionicons name="camera-outline" size={40} color={colores.textoSobreOscuro} />
              )}

              {/* Small camera icon badge */}
              <View className="absolute bottom-0 right-0 bg-chido-cabecera w-10 h-10 rounded-full items-center justify-center border-2 border-chido-fondo">
                <Ionicons name="camera" size={20} color={colores.textoSobreOscuro} />
              </View>
            </TouchableOpacity>
            <Text className="text-chido-texto-sobre-oscuro text-sm">Tomar foto con la cámara</Text>
            {errors.fotoBase64 && <Text className="text-chido-error text-sm mt-1">{errors.fotoBase64}</Text>}
          </View>

          {/* Scan DNI Button */}
          <TouchableOpacity
            className="bg-chido-acento flex-row justify-center items-center p-4 rounded-2xl mb-6"
            onPress={() => {
              if (!permission?.granted) requestPermission();
              else {
                isScanningDniRef.current = false;
                setScanningDni(true);
              }
            }}
          >
            <Ionicons name="qr-code-outline" size={20} color={colores.textoSobreOscuro} className="mr-2" />
            <Text className="text-chido-texto-sobre-oscuro font-bold text-lg ml-2">Escanear QR del DNI</Text>
          </TouchableOpacity>

          {/* Form Fields */}
          <View className="flex-row gap-4">
            <Input 
              label="Nombres"
              placeholder="Ej. María José"
              value={formData.nombres}
              onChangeText={(t) => setFormData(prev => ({...prev, nombres: formatName(t)}))}
              error={errors.nombres}
              containerClassName="flex-1"
            />
            <Input 
              label="Apellidos"
              placeholder="Ej. González"
              value={formData.apellidos}
              onChangeText={(t) => setFormData(prev => ({...prev, apellidos: formatName(t)}))}
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
            error={errors.dni}
          />

          <Input 
            label="CUIL"
            placeholder="Ej. 20-34567890-3"
            value={formData.cuil}
            keyboardType="numeric"
            onChangeText={(t) => setFormData(prev => ({...prev, cuil: formatCuil(t)}))}
            error={errors.cuil}
          />

          <Input 
            label="Correo electrónico"
            placeholder="empleado@correo.com"
            value={formData.correo}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(t) => setFormData(prev => ({...prev, correo: t}))}
            error={errors.correo}
          />

          <Input 
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            value={formData.password}
            secureTextEntry
            onChangeText={(t) => setFormData(prev => ({...prev, password: t}))}
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
                  className={`px-4 py-2 rounded-full mr-2 border-2 ${
                    formData.perfil === rol
                      ? 'bg-chido-texto-secundario-alternativo border-chido-texto-secundario-alternativo'
                      : 'bg-chido-acento border-chido-cabecera'
                  }`}
                >
                  <Text
                    className={`font-bold ${
                      formData.perfil === rol ? 'text-chido-cabecera' : 'text-chido-texto-sobre-oscuro'
                    }`}
                  >
                    {rol.charAt(0).toUpperCase() + rol.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Guardar */}
          <PrimaryButton 
            title="Guardar Empleado"
            onPress={handleSubmit}
            className="mt-4 mb-12"
            isLoading={guardando}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Scanner DNI */}
      <Modal visible={scanningDni} animationType="slide">
        <View className="flex-1 bg-black">
          {permission?.granted && (
            <CameraView 
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={handleBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['pdf417', 'qr'] }}
            />
          )}
          <View className="absolute bottom-10 left-0 right-0 items-center">
            <Text className="text-chido-texto-sobre-oscuro bg-black/50 p-2 mb-4 rounded text-center">Apunte al código del DNI</Text>
            <TouchableOpacity className="bg-chido-error px-6 py-4 rounded-full" onPress={() => setScanningDni(false)}>
              <Text className="text-chido-texto-sobre-oscuro font-bold text-lg">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    </View>
  );
}
