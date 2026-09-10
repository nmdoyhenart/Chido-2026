import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';

const QR_ENTRADA = 'ENTRADA_LOCAL';
const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';

export default function EscanearEntrada() {

    const [permission, requestPermission] = useCameraPermissions();
    const [escaneando, setEscaneando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const procesando = useRef(false);

    const abrirScanner = () => {
        if (!permission?.granted) {
            requestPermission();
            return;
        }
        procesando.current = false;
        setMensaje('');
        setEscaneando(true);
    };

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        if (procesando.current) return;
        procesando.current = true;

        setEscaneando(false);

        if (data !== QR_ENTRADA) {
            setMensaje('Este código QR no corresponde al ingreso del local.');
            return;
        }

        const idExistente = await AsyncStorage.getItem(CLIENTE_ANONIMO_ID_KEY);

        if (idExistente) {
            router.push('/cliente-anonimo/espera');
        } else {
            const nuevoId = Crypto.randomUUID();
            await AsyncStorage.setItem(CLIENTE_ANONIMO_ID_KEY, nuevoId);
            router.push('/cliente-anonimo/alta');
        }
    };

    return (
        <View className="flex-1 bg-[#cf6f37] items-center justify-center px-6">
            <Stack.Screen options={{ headerShown: false }} />

            <Text className="text-[#fff8ec] text-3xl font-bold mb-3 text-center">
                Escanear QR de entrada
            </Text>
            <Text className="text-[#ffe4cf] text-xl text-center mb-10">
                Buscá el código QR de la entrada del local para anotarte en la lista de espera.
            </Text>

            <TouchableOpacity
                onPress={abrirScanner}
                className="bg-[#8f3d22] w-full px-8 py-6 rounded-2xl flex-row items-center justify-center"
            >
                <Ionicons name="qr-code-outline" size={28} color="#fff8ec" />
                <Text className="text-[#fff8ec] font-bold text-2xl ml-2">Escanear código QR</Text>
            </TouchableOpacity>

            {mensaje !== '' && (
                <Text className="text-[#ff6b57] text-lg text-center mt-6 px-6 font-semibold">
                    {mensaje}
                </Text>
            )}

            <Modal visible={escaneando} animationType="slide">
                <View className="flex-1 bg-black">
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        onBarcodeScanned={handleBarcodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    />
                    <View className="absolute bottom-10 left-0 right-0 items-center">
                        <TouchableOpacity
                            onPress={() => setEscaneando(false)}
                            className="bg-[#c94f4f] px-8 py-5 rounded-full"
                        >
                            <Text className="text-[#fff8ec] font-bold text-xl">Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    )
}