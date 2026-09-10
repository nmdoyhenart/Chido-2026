import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Image, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { subirFotoCliente } from '../../../lib/clientesAnonimos';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';

export default function AltaClienteAnonimo() {

    const [nombre, setNombre] = useState('');
    const [foto, setFoto] = useState<string | null>(null);
    const [tomandoFoto, setTomandoFoto] = useState(false);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<any>(null);

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
            const identificador = await AsyncStorage.getItem(CLIENTE_ANONIMO_ID_KEY);
            const fotoUrl = await subirFotoCliente(foto);

            const { error: errorInsert } = await supabase.from('lista_espera').insert({
                identificador,
                nombre: nombre.trim(),
                foto_url: fotoUrl,
                tipo_cliente: 'anonimo',
                estado: 'esperando',
            });

            if (errorInsert) throw errorInsert;

            router.push('/cliente-anonimo/espera');
        } catch (err) {
            console.error(err);
            setError('Ocurrió un error al guardar. Intentá de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <View className="flex-1 bg-[#d97736] p-6">
            <Stack.Screen options={{ headerShown: false }} />

            <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-xl bg-[#b35e25] items-center justify-center mb-6"
            >
                <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>

            <Text className="text-white text-2xl font-bold text-center mb-6">
                Anotate en la lista de espera
            </Text>

            <View className="items-center mb-6">
                <TouchableOpacity
                    onPress={abrirCamara}
                    className="w-32 h-32 rounded-full border-2 border-dashed border-[#e6b18c] items-center justify-center overflow-hidden"
                >
                    {foto ? (
                        <Image source={{ uri: foto }} className="w-full h-full" />
                    ) : (
                        <Ionicons name="camera-outline" size={40} color="#fff" />
                    )}
                </TouchableOpacity>
                <Text className="text-white text-sm mt-2">Tomar foto</Text>
            </View>

            <Input
                label="Nombre"
                placeholder="Ej. María José"
                value={nombre}
                onChangeText={setNombre}
            />

            {error !== '' && (
                <Text className="text-red-200 text-center mt-2">{error}</Text>
            )}

            <TouchableOpacity
                onPress={handleGuardar}
                disabled={guardando}
                className="bg-[#9c5120] p-4 rounded-xl mt-4 items-center"
            >
                {guardando ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text className="text-white font-bold text-lg">Guardar</Text>
                )}
            </TouchableOpacity>

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
                            className="bg-red-600 px-6 py-4 rounded-full"
                            onPress={() => setTomandoFoto(false)}
                        >
                            <Text className="text-white font-bold text-lg">Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="bg-[#b35e25] px-6 py-4 rounded-full"
                            onPress={tomarFoto}
                        >
                            <Text className="text-white font-bold text-lg">Capturar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    )
}