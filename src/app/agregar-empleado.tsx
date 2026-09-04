import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, Modal, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/ui/Input';
import { Header } from '../components/Header';

export default function AgregarEmpleado() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanningDni, setScanningDni] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    dni: '',
    cuil: '',
    correo: '',
    contraseña: '',
    perfil: 'cocinero', // Not shown in UI mockup but required by specs
    foto: null as string | null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const cameraRef = useRef<any>(null);

  const validate = () => {
    let newErrors: Record<string, string> = {};
    if (!formData.nombres.trim()) newErrors.nombres = "Requerido";
    if (!formData.apellidos.trim()) newErrors.apellidos = "Requerido";
    if (!formData.dni.trim() || !/^\d{7,8}$/.test(formData.dni)) newErrors.dni = "DNI inválido";
    if (!formData.cuil.trim() || !/^\d{2}-?\d{8}-?\d{1}$/.test(formData.cuil)) newErrors.cuil = "CUIL inválido";
    if (!formData.correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) newErrors.correo = "Correo inválido";
    if (!formData.contraseña.trim() || formData.contraseña.length < 6) newErrors.contraseña = "Mínimo 6 caracteres";
    if (!formData.foto) newErrors.foto = "Foto requerida";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      Alert.alert("Éxito", "Empleado guardado correctamente.");
    } else {
      Alert.alert("Error", "Por favor, revise los campos marcados.");
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
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
        apellidos: apellidos.replace(/[^a-zA-Z\s]/g, ''),
        nombres: nombres.replace(/[^a-zA-Z\s]/g, ''),
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
      setFormData(prev => ({ ...prev, foto: photo.uri }));
      setTakingPhoto(false);
    }
  };

  return (
    <View className="flex-1 bg-[#d97736]">
      <Stack.Screen options={{ headerShown: false }} />
      
      <Header userName="Laura Gauto Morales" role="Dueño" />

      <ScrollView className="flex-1 p-5">
        {/* Top bar with back button and title */}
        <View className="flex-row items-center mb-8 relative">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-[#b35e25] items-center justify-center absolute left-0 z-10"
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white text-center flex-1">Alta de empleado</Text>
        </View>

        {/* Camera Button */}
        <View className="items-center mb-6">
          <TouchableOpacity 
            onPress={() => {
              if (!permission?.granted) requestPermission();
              else setTakingPhoto(true);
            }}
            className="w-32 h-32 rounded-full border-2 border-dashed border-[#e6b18c] items-center justify-center mb-2"
          >
            {formData.foto ? (
              <Image source={{uri: formData.foto}} className="w-full h-full rounded-full" />
            ) : (
              <Ionicons name="camera-outline" size={40} color="#fff" />
            )}
            
            {/* Small camera icon badge */}
            <View className="absolute bottom-0 right-0 bg-[#9c5120] w-10 h-10 rounded-full items-center justify-center border-2 border-[#d97736]">
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text className="text-white text-sm">Tomar foto con la cámara</Text>
          {errors.foto && <Text className="text-red-300 text-xs mt-1">{errors.foto}</Text>}
        </View>

        {/* Scan DNI Button */}
        <TouchableOpacity 
          className="bg-[#b35e25] flex-row justify-center items-center p-4 rounded-2xl mb-6"
          onPress={() => {
            if (!permission?.granted) requestPermission();
            else setScanningDni(true);
          }}
        >
          <Ionicons name="qr-code-outline" size={20} color="#fff" className="mr-2" />
          <Text className="text-white font-bold text-lg ml-2">Escanear QR del DNI</Text>
        </TouchableOpacity>

        {/* Form Fields */}
        <View className="flex-row gap-4">
          <Input 
            label="Nombres"
            placeholder="Ej. María José"
            value={formData.nombres}
            onChangeText={(t) => setFormData(prev => ({...prev, nombres: t}))}
            error={errors.nombres}
            containerClassName="flex-1"
          />
          <Input 
            label="Apellidos"
            placeholder="Ej. González"
            value={formData.apellidos}
            onChangeText={(t) => setFormData(prev => ({...prev, apellidos: t}))}
            error={errors.apellidos}
            containerClassName="flex-1"
          />
        </View>

        <Input 
          label="DNI"
          placeholder="Ej. 34567890"
          value={formData.dni}
          keyboardType="numeric"
          onChangeText={(t) => setFormData(prev => ({...prev, dni: t}))}
          error={errors.dni}
        />

        <Input 
          label="CUIL"
          placeholder="Ej. 20-34567890-3"
          value={formData.cuil}
          keyboardType="numeric"
          onChangeText={(t) => setFormData(prev => ({...prev, cuil: t}))}
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
          placeholder="Mínimo 6 caracteres"
          value={formData.contraseña}
          secureTextEntry
          onChangeText={(t) => setFormData(prev => ({...prev, contraseña: t}))}
          error={errors.contraseña}
        />

        {/* Guardar */}
        <TouchableOpacity 
          className="bg-[#9c5120] p-4 rounded-xl mt-4 mb-12 items-center"
          onPress={handleSubmit}
        >
          <Text className="text-white font-bold text-lg">Guardar Empleado</Text>
        </TouchableOpacity>
      </ScrollView>

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
            <Text className="text-white bg-black/50 p-2 mb-4 rounded text-center">Apunte al código del DNI</Text>
            <TouchableOpacity className="bg-red-600 px-6 py-4 rounded-full" onPress={() => setScanningDni(false)}>
              <Text className="text-white font-bold text-lg">Cancelar</Text>
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
              facing="front"
            />
          )}
          <View className="absolute bottom-10 left-0 right-0 flex-row justify-center gap-4">
            <TouchableOpacity className="bg-red-600 px-6 py-4 rounded-full" onPress={() => setTakingPhoto(false)}>
              <Text className="text-white font-bold text-lg">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-[#b35e25] px-6 py-4 rounded-full" onPress={takePicture}>
              <Text className="text-white font-bold text-lg">Capturar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
