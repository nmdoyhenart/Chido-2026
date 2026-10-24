import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Image, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Input } from '../../components/ui/Input';
import { subirFotoCliente } from '../../../lib/clientesAnonimos';
import { colores } from '../../theme/colores';
import { useCampoVisibleConTeclado } from '../../hooks/useCampoVisibleConTeclado';
import { useVibrarError } from '../../hooks/useVibrarError';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';
const CLIENTE_ANONIMO_NOMBRE_KEY = 'cliente_anonimo_nombre';
const CLIENTE_ANONIMO_FOTO_KEY = 'cliente_anonimo_foto_url';

export default function AltaClienteAnonimo() {

    const [nombre, setNombre] = useState('');
    const [foto, setFoto] = useState<string | null>(null);
    const [tomandoFoto, setTomandoFoto] = useState(false);
    const [error, setError] = useState('');
    useVibrarError(error);
    const [guardando, setGuardando] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<any>(null);
    const scroll = useRef<ScrollView>(null);
    const { alDesplazar, alEnfocar, rellenoInferior } = useCampoVisibleConTeclado(scroll);

    const abrirCamara = () => {
        if (!permission?.granted) {
            requestPermission();
            return;
        }
        setTomandoFoto(true);
    };

    const tomarFoto = async () => {
        if (cameraRef.current) {
            const resultado = await cameraRef.current.takePictureAsync({ quality: 0.5 });
            setFoto(resultado.uri);
            setTomandoFoto(false);
        }
    };

    const handleGuardar = async () => {
        if (!nombre.trim()) {
            setError('Ingresá tu nombre.');
            return;
        }
        if (!foto) {
            setError('Sacate una foto antes de continuar.');
            return;
        }
        setError('');
        setGuardando(true);

        try {
            let identificador = await AsyncStorage.getItem(CLIENTE_ANONIMO_ID_KEY);
            if (!identificador) {
                identificador = Crypto.randomUUID();
                await AsyncStorage.setItem(CLIENTE_ANONIMO_ID_KEY, identificador);
            }

            const fotoUrl = await subirFotoCliente(foto);

            await AsyncStorage.setItem(CLIENTE_ANONIMO_NOMBRE_KEY, nombre.trim());
            await AsyncStorage.setItem(CLIENTE_ANONIMO_FOTO_KEY, fotoUrl);

            router.push('/cliente-anonimo/escanear');
        } catch (err) {
            console.error(err);
            setError('Ocurrió un error al guardar. Intentá de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-chido-fondo">
            <Stack.Screen options={{ headerShown: false }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView ref={scroll} className="flex-1 px-6" contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 + rellenoInferior }} keyboardShouldPersistTaps="handled" onScroll={alDesplazar} scrollEventThrottle={16}>
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}
                        className="w-14 h-14 rounded-xl bg-chido-cabecera items-center justify-center mt-4"
                    >
                        <Ionicons name="arrow-back" size={26} color={colores.textoSobreOscuro} />
                    </TouchableOpacity>

                    <View className="flex-1 justify-around">
                        <Text className="text-chido-texto-sobre-oscuro text-3xl font-bold text-center">
                            Registrate para ingresar
                        </Text>

                        <View className="items-center">
                            <TouchableOpacity
                                onPress={abrirCamara}
                                className="w-56 h-56 rounded-full border-4 border-dashed border-chido-acento items-center justify-center overflow-hidden"
                            >
                                {foto ? (
                                    <Image source={{ uri: foto }} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="camera-outline" size={64} color={colores.textoSobreOscuro} />
                                )}
                            </TouchableOpacity>
                            <Text className="text-chido-texto-secundario-alternativo text-lg mt-3">Tomar foto</Text>
                        </View>

                        <View>
                            <Input
                                label="Nombre"
                                placeholder="Ej. María José"
                                value={nombre}
                                onChangeText={setNombre}
                                onFocus={alEnfocar}
                            />

                            {/* Rojo oscuro de la paleta: un rojo vivo no se distingue sobre el fondo naranja. */}
                            {error !== '' && (
                                <View className="flex-row items-center justify-center gap-2 mt-3">
                                    <Ionicons name="alert-circle" size={26} color={colores.error} />
                                    <Text
                                        className="shrink text-lg font-bold text-chido-error"
                                        accessibilityRole="alert"
                                        accessibilityLiveRegion="assertive"
                                    >
                                        {error}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            onPress={handleGuardar}
                            disabled={guardando}
                            className="bg-chido-cabecera w-full px-8 py-6 rounded-2xl items-center"
                        >
                            {guardando ? (
                                <ActivityIndicator color={colores.textoSobreOscuro} />
                            ) : (
                                <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl">Guardar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={tomandoFoto} animationType="slide">
                <View className="flex-1 bg-black">
                    {permission?.granted && (
                        <CameraView
                            style={StyleSheet.absoluteFill}
                            ref={cameraRef}
                            facing="front"
                        />
                    )}
                    <View className="absolute bottom-10 left-0 right-0 flex-row justify-center gap-4">
                        <TouchableOpacity
                            onPress={() => setTomandoFoto(false)}
                            className="bg-chido-error px-8 py-5 rounded-full"
                        >
                            <Text className="text-chido-texto-sobre-oscuro font-bold text-xl">Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={tomarFoto}
                            className="bg-chido-acento px-8 py-5 rounded-full"
                        >
                            <Text className="text-chido-texto-sobre-oscuro font-bold text-xl">Capturar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}
