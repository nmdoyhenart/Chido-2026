import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { obtenerClienteEnListaPorId } from '../../../lib/clientesAnonimos';
import { parseQrPayload } from '../../utils/qr';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';
const CLIENTE_ANONIMO_NOMBRE_KEY = 'cliente_anonimo_nombre';
const CLIENTE_ANONIMO_FOTO_KEY = 'cliente_anonimo_foto_url';

export default function EscanearMesa() {

    const [permission, requestPermission] = useCameraPermissions();
    const [escaneando, setEscaneando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [confirmado, setConfirmado] = useState(false);
    const procesando = useRef(false);
    const miMesaId = useRef<string | null>(null);

    useEffect(() => {
        (async () => {
            const identificador = await AsyncStorage.getItem(CLIENTE_ANONIMO_ID_KEY);
            if (!identificador) {
                router.push('/cliente-anonimo/alta');
                return;
            }

            try {
                const clienteEnLista = await obtenerClienteEnListaPorId(identificador);
                if (!clienteEnLista || clienteEnLista.estado !== 'asignado' || !clienteEnLista.mesa_id) {
                    setMensaje('Todavía no tenés una mesa asignada.');
                    return;
                }
                miMesaId.current = clienteEnLista.mesa_id;
            } catch (err) {
                console.error(err);
                setMensaje('No se pudo verificar tu mesa asignada. Intentá de nuevo.');
            }
        })();
    }, []);

    const abrirScanner = () => {
        if (!miMesaId.current) return;
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

        const payload = parseQrPayload(data);

        if (!payload || payload.tipo !== 'mesa') {
            setMensaje('Este código QR no corresponde a una mesa.');
            return;
        }

        if (payload.mesaId !== miMesaId.current) {
            setMensaje('Esta no es tu mesa asignada. Fijate el número con el metre.');
            return;
        }

        setConfirmado(true);
    };

    const salirDelLocal = async () => {
        await AsyncStorage.removeItem(CLIENTE_ANONIMO_ID_KEY);
        await AsyncStorage.removeItem(CLIENTE_ANONIMO_NOMBRE_KEY);
        await AsyncStorage.removeItem(CLIENTE_ANONIMO_FOTO_KEY);
        router.replace('/(auth)/login');
    };

    if (confirmado) {
        return (
            <View className="flex-1 bg-chido-fondo items-center justify-center px-6">
                <Stack.Screen options={{ headerShown: false }} />

                <Ionicons name="checkmark-circle-outline" size={96} color={colores.textoSobreOscuro} />

                <Text className="text-chido-texto-sobre-oscuro text-3xl font-bold mb-3 text-center mt-4">
                    ¡Listo, disfrutá tu mesa!
                </Text>
                <Text className="text-chido-texto-secundario-alternativo text-xl text-center mb-10">
                    Ya podés sentarte, en breve te va a atender un mozo.
                </Text>

                <TouchableOpacity
                    onPress={salirDelLocal}
                    className="bg-chido-cabecera w-full px-8 py-6 rounded-2xl flex-row items-center justify-center mt-6"
                >
                    <Ionicons name="exit-outline" size={28} color={colores.textoSobreOscuro} />
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">Salir del local</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-chido-fondo items-center justify-center px-6">
            <Stack.Screen options={{ headerShown: false }} />

            <Text className="text-chido-texto-sobre-oscuro text-3xl font-bold mb-3 text-center">
                Escanear QR de tu mesa
            </Text>
            <Text className="text-chido-texto-secundario-alternativo text-xl text-center mb-10">
                Buscá el código QR que está en la mesa que te asignaron.
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