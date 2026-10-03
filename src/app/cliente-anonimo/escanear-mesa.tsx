import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { obtenerClienteEnListaPorId } from '../../../lib/clientesAnonimos';
import { parseQrPayload } from '../../utils/qr';
import { QRScanner } from '../../components/ui/QRScanner';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';
const CLIENTE_ANONIMO_NOMBRE_KEY = 'cliente_anonimo_nombre';
const CLIENTE_ANONIMO_FOTO_KEY = 'cliente_anonimo_foto_url';

export default function EscanearMesa() {

    // Se llega desde "Escanear mi mesa", así que la cámara se abre de entrada
    const [escaneando, setEscaneando] = useState(true);
    const [mensaje, setMensaje] = useState('');
    const [confirmado, setConfirmado] = useState(false);
    const miMesaId = useRef<string | null>(null);
    const mesaConfirmada = useRef(false);
    const insets = useSafeAreaInsets();

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
                    setEscaneando(false);
                    setMensaje('Todavía no tenés una mesa asignada.');
                    return;
                }
                miMesaId.current = clienteEnLista.mesa_id;
            } catch (err) {
                console.error(err);
                setEscaneando(false);
                setMensaje('No se pudo verificar tu mesa asignada. Intentá de nuevo.');
            }
        })();
    }, []);

    const abrirScanner = () => {
        if (!miMesaId.current) return;
        setMensaje('');
        setEscaneando(true);
    };

    // QRScanner también llama a onClose después de un escaneo correcto: ahí no hay que volver atrás
    const cerrarScanner = () => {
        setEscaneando(false);
        if (!mesaConfirmada.current && router.canGoBack()) router.back();
    };

    // QRScanner muestra el error del throw y deja reintentar sin cerrar la cámara
    const confirmarMesa = async (data: string) => {
        if (!miMesaId.current) {
            throw new Error('Estamos verificando tu mesa asignada. Probá de nuevo en un momento.');
        }

        const payload = parseQrPayload(data);

        if (!payload || payload.tipo !== 'mesa') {
            throw new Error('Este código QR no corresponde a una mesa.');
        }

        if (payload.mesaId !== miMesaId.current) {
            throw new Error('Esta no es tu mesa asignada. Fijate el número con el metre.');
        }

        mesaConfirmada.current = true;
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
            // Los paddings dejan todo entre la barra de estado y la barra de navegación de Android, sin scroll
            <View
                className="flex-1 bg-chido-fondo"
                style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8 }}
            >
                <Stack.Screen options={{ headerShown: false }} />

                {/* La mascota toma el espacio que sobra y se achica en pantallas chicas para que todo entre */}
                <Image
                    source={require('../../../assets/images/mascota-espera.png')}
                    style={{ flex: 1, width: '85%', minHeight: 0, alignSelf: 'center', marginVertical: 8 }}
                    resizeMode="contain"
                />

                <Text className="text-chido-texto-sobre-oscuro text-4xl font-bold text-center w-full mt-4 mb-3">
                    ¡Listo, disfrutá tu mesa!
                </Text>
                <Text className="text-chido-texto-secundario-alternativo text-2xl text-center w-full mb-8">
                    Ya podés sentarte, en breve te va a atender un mozo.
                </Text>

                <TouchableOpacity
                    onPress={salirDelLocal}
                    className="bg-chido-cabecera w-full px-6 py-7 rounded-2xl flex-row items-center justify-center"
                >
                    <Ionicons name="exit-outline" size={36} color={colores.textoSobreOscuro} />
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-3xl ml-3">Salir del local</Text>
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

            <QRScanner visible={escaneando} proposito="mesa" onScan={confirmarMesa} onClose={cerrarScanner} />
        </View>
    )
}