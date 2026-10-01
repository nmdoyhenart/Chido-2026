import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { obtenerClienteEnListaPorId, suscribirseAMiEstado } from '../../../lib/clientesAnonimos';
import { useAppSession } from '../../contexts/AppSessionContext';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';
const CLIENTE_ANONIMO_NOMBRE_KEY = 'cliente_anonimo_nombre';
const CLIENTE_ANONIMO_FOTO_KEY = 'cliente_anonimo_foto_url';

export default function EsperaClienteAnonimo() {
    
    const { cerrarSesion } = useAppSession();
    const [fueEliminado, setFueEliminado] = useState(false);
    const [mesaAsignada, setMesaAsignada] = useState<string | null>(null);
    const [saliendo, setSaliendo] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let desuscribirse: (() => void) | undefined;

        (async () => {
            const identificador = await AsyncStorage.getItem(CLIENTE_ANONIMO_ID_KEY);
            if (!identificador) return;

            try {
                const filaActual = await obtenerClienteEnListaPorId(identificador);
                if (filaActual?.estado === 'eliminado') {
                    setFueEliminado(true);
                } else if (filaActual?.estado === 'asignado') {
                    setMesaAsignada(filaActual.mesa_id);
                }
            } catch (err) {
                console.error('Error al chequear el estado inicial:', err);
            }

            desuscribirse = suscribirseAMiEstado(identificador, (fila) => {
                if (fila.estado === 'eliminado') {
                    setFueEliminado(true);
                } else if (fila.estado === 'asignado') {
                    setMesaAsignada(fila.mesa_id);
                }
            });
        })();

        return () => {
            if (desuscribirse) desuscribirse();
        };
    }, []);

    const salirDelLocal = async () => {
        await AsyncStorage.removeItem(CLIENTE_ANONIMO_ID_KEY);
        await AsyncStorage.removeItem(CLIENTE_ANONIMO_NOMBRE_KEY);
        await AsyncStorage.removeItem(CLIENTE_ANONIMO_FOTO_KEY);
        router.replace('/(auth)/login');
    };

    const verEncuestasPrevias = () => {
        router.push('/encuestas/previas');
    };

    const escanearMiMesa = () => {
        router.push('/cliente-anonimo/escanear-mesa');
    };

    if (fueEliminado) {
        return (
            <View className="flex-1 bg-chido-fondo items-center justify-center p-6">
                <Stack.Screen options={{ headerShown: false }} />

                <Image
                    source={require('../../../assets/images/mascota-rechazado.png')}
                    style={{ width: 200, height: 200 }}
                    resizeMode="contain"
                />

                <Text className="text-chido-texto-sobre-oscuro text-3xl font-bold text-center mt-4 mb-3">
                    Fuiste eliminado de la lista
                </Text>
                <Text className="text-chido-texto-secundario-alternativo text-xl text-center mb-10">
                    El metre te sacó de la lista de espera. Podés volver a anotarte cuando quieras.
                </Text>

                <TouchableOpacity
                    onPress={salirDelLocal}
                    className="bg-chido-cabecera w-full px-8 py-6 rounded-2xl flex-row items-center justify-center"
                >
                    <Ionicons name="arrow-back-outline" size={28} color={colores.textoSobreOscuro} />
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">Volver al inicio</Text>
                </TouchableOpacity>
            </View>
        );
    }

        if (mesaAsignada) {
        return (
            <View className="flex-1 bg-chido-fondo items-center justify-center p-6">
                <Stack.Screen options={{ headerShown: false }} />

                <Image
                    source={require('../../../assets/images/mascota-espera.png')}
                    style={{ width: 240, height: 240 }}
                    resizeMode="contain"
                />

                <Text className="text-chido-texto-sobre-oscuro text-3xl font-bold text-center mt-4 mb-3">
                    ¡Te asignaron una mesa!
                </Text>
                <Text className="text-chido-texto-secundario-alternativo text-xl text-center mb-10">
                    Escaneá el código QR de tu mesa para ingresar.
                </Text>

                <TouchableOpacity
                    onPress={escanearMiMesa}
                    className="bg-chido-acento w-full px-8 py-6 rounded-2xl flex-row items-center justify-center mb-4"
                >
                    <Ionicons name="qr-code-outline" size={28} color={colores.textoSobreOscuro} />
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">Escanear mi mesa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={salirDelLocal}
                    className="bg-chido-cabecera w-full px-8 py-6 rounded-2xl flex-row items-center justify-center"
                >
                    <Ionicons name="exit-outline" size={28} color={colores.textoSobreOscuro} />
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">Salir del local</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-chido-fondo items-center justify-center p-6">
            <Stack.Screen options={{ headerShown: false }} />

            <Image
                source={require('../../../assets/images/mascota-espera.png')}
                style={{ width: 240, height: 240 }}
                resizeMode="contain"
            />

            <Text className="text-chido-texto-sobre-oscuro text-3xl font-bold text-center mt-4 mb-3">
                ¡Ya estás anotado!
            </Text>
            <Text className="text-chido-texto-secundario-alternativo text-xl text-center mb-10">
                Estás en la lista de espera. En cuanto el metre te asigne una mesa, vas a poder ingresar.
            </Text>

            <TouchableOpacity
                onPress={verEncuestasPrevias}
                className="bg-chido-acento w-full px-8 py-6 rounded-2xl flex-row items-center justify-center mb-4"
            >
                <Ionicons name="stats-chart-outline" size={28} color={colores.textoSobreOscuro} />
                <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">Ver encuestas anteriores</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={salirDelLocal}
                disabled={saliendo}
                className="bg-chido-cabecera w-full px-8 py-6 rounded-2xl flex-row items-center justify-center"
            >
                <Ionicons name="exit-outline" size={28} color={colores.textoSobreOscuro} />
                <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">{saliendo ? 'Saliendo…' : 'Salir del local'}</Text>
            </TouchableOpacity>
            {!!Error && <Text accessibilityLiveRegion="assertive" className="text-chido-texto-sobre-oscuro text-center mt-4">{error}</Text>}
        </View>
    );
}
