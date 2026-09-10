import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

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
        <View className="flex-1 bg-[#d97736] items-center justify-center">
            <Stack.Screen options={{ headerShown: false }} />
            <Text className="text-white text-xl mb-6">Escanear QR de entrada</Text>

            <TouchableOpacity
                onPress={abrirScanner}
                className="bg-[#b35e25] px-6 py-4 rounded-2xl"
            >
                <Text className="text-white font-bold text-lg">Escanear código QR</Text>
            </TouchableOpacity>

            {mensaje !== '' && (
                <Text className="text-white text-center mt-6 px-6">{mensaje}</Text>
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
                            className="bg-red-600 px-6 py-4 rounded-full"
                            onPress={() => setEscaneando(false)}
                        >
                            <Text className="text-white font-bold text-lg">Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    )
}