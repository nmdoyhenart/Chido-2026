import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { CerrarSesionButton } from '../../components/auth/CerrarSesionButton';
import { obtenerClienteEnListaPorId } from '../../../lib/clientesAnonimos';

const QR_ENTRADA = 'chido:ingreso:v1';
const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';

export default function EscanearEntrada() {

    const [permission, requestPermission] = useCameraPermissions();
    const [escaneando, setEscaneando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const procesando = useRef(false);
    const insets = useSafeAreaInsets();

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

        const identificador = await AsyncStorage.getItem(CLIENTE_ANONIMO_ID_KEY);

        if (!identificador) {
            router.push('/cliente-anonimo/alta');
            return;
        }

        try {
            const clienteEnLista = await obtenerClienteEnListaPorId(identificador);
            if (clienteEnLista) {
                router.push('/cliente-anonimo/espera');
            } else {
                router.push('/cliente-anonimo/elegir');
            }
        } catch (err) {
            console.error(err);
            setMensaje('No se pudo verificar tu estado. Intentá de nuevo.');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-chido-fondo" edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View className="items-end px-4 pt-3 pb-3"><CerrarSesionButton /></View>
            {/* El paddingBottom deja el botón por encima de la barra de navegación de Android */}
            <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>

            {/* La mascota toma el espacio que sobra y se achica en pantallas chicas para que todo entre sin scroll */}
            <Image
                source={require('../../../assets/images/mascota-escanear-qr.png')}
                style={{ flex: 1, width: '85%', minHeight: 0, alignSelf: 'center', marginVertical: 8 }}
                resizeMode="contain"
            />

            <Text className="text-chido-texto-sobre-oscuro text-4xl font-bold mt-4 mb-3 text-center w-full">
                Escanear QR de entrada
            </Text>
            <Text className="text-chido-texto-secundario-alternativo text-2xl text-center mb-8 w-full">
                Buscá el código QR de la entrada del local para continuar.
            </Text>

            <TouchableOpacity
                onPress={abrirScanner}
                className="bg-chido-cabecera w-full px-6 py-7 rounded-2xl flex-row items-center justify-center"
            >
                <Ionicons name="qr-code-outline" size={36} color={colores.textoSobreOscuro} />
                <Text className="text-chido-texto-sobre-oscuro font-bold text-3xl ml-3">Escanear código QR</Text>
            </TouchableOpacity>

            {/* Fondo bordó oscuro con texto claro para que el error se lea bien sobre el fondo naranja */}
            {mensaje !== '' && (
                <View className="bg-chido-error w-full mt-6 px-5 py-5 rounded-2xl flex-row items-center">
                    <Ionicons name="alert-circle" size={40} color={colores.textoSobreOscuro} />
                    <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold ml-3 flex-1">
                        {mensaje}
                    </Text>
                </View>
            )}
            </View>

            <Modal visible={escaneando} animationType="slide">
                <View className="flex-1 bg-black">
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        onBarcodeScanned={handleBarcodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    />
                    <View className="absolute left-0 right-0 items-center" style={{ bottom: insets.bottom + 40 }}>
                        <TouchableOpacity
                            onPress={() => setEscaneando(false)}
                            className="bg-chido-error px-8 py-5 rounded-full"
                        >
                            <Text className="text-chido-texto-sobre-oscuro font-bold text-xl">Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}
