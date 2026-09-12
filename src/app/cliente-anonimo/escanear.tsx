import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';

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
        <View className="flex-1 bg-chido-fondo items-center justify-center px-6">
            <Stack.Screen options={{ headerShown: false }} />

            <Text className="text-chido-texto-sobre-oscuro text-3xl font-bold mb-3 text-center">
                Escanear QR de entrada
            </Text>
            <Text className="text-chido-texto-secundario-alternativo text-xl text-center mb-10">
                Buscá el código QR de la entrada del local para anotarte en la lista de espera.
            </Text>

            <TouchableOpacity
                onPress={abrirScanner}
                className="bg-chido-cabecera w-full px-8 py-6 rounded-2xl flex-row items-center justify-center"
            >
                <Ionicons name="qr-code-outline" size={28} color={colores.textoSobreOscuro} />
                <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">Escanear código QR</Text>
            </TouchableOpacity>

            {mensaje !== '' && (
                <Text className="text-chido-notificacion text-lg text-center mt-6 px-6 font-semibold">
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
                            className="bg-chido-error px-8 py-5 rounded-full"
                        >
                            <Text className="text-chido-texto-sobre-oscuro font-bold text-xl">Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    )
}