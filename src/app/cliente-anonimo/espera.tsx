import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { obtenerClienteEnListaPorId, suscribirseAMiEstado } from '../../../lib/clientesAnonimos';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';
const CLIENTE_ANONIMO_NOMBRE_KEY = 'cliente_anonimo_nombre';
const CLIENTE_ANONIMO_FOTO_KEY = 'cliente_anonimo_foto_url';

export default function EsperaClienteAnonimo() {
    
    const insets = useSafeAreaInsets();
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
        setSaliendo(true);
        setError('');
        try {
            await AsyncStorage.removeItem(CLIENTE_ANONIMO_ID_KEY);
            await AsyncStorage.removeItem(CLIENTE_ANONIMO_NOMBRE_KEY);
            await AsyncStorage.removeItem(CLIENTE_ANONIMO_FOTO_KEY);
            router.replace('/(auth)/login');
        } catch {
            setError('No se pudo cerrar la sesión. Intentá de nuevo.');
        } finally {
            setSaliendo(false);
        }
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
                    ¡Te asignaron una mesa!
                </Text>
                <Text className="text-chido-texto-secundario-alternativo text-2xl text-center w-full mb-8">
                    Escaneá el código QR de tu mesa para ingresar.
                </Text>

                <TouchableOpacity
                    onPress={escanearMiMesa}
                    className="bg-chido-acento w-full px-6 py-7 rounded-2xl flex-row items-center justify-center mb-4"
                >
                    <Ionicons name="qr-code-outline" size={36} color={colores.textoSobreOscuro} />
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-3xl ml-3">Escanear mi mesa</Text>
                </TouchableOpacity>

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
        // Los paddings dejan todo entre la barra de estado y la barra de navegación de Android, sin scroll
        <View
            className="flex-1 bg-chido-fondo"
            style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
            <Stack.Screen options={{ headerShown: false }} />

            {/* La mascota toma el espacio que sobra y se achica en pantallas chicas para que todo entre */}
            <Image
                source={require('../../../assets/images/mascota-espera.png')}
                style={{ flex: 1, width: '90%', minHeight: 0, alignSelf: 'center', marginVertical: 8 }}
                resizeMode="contain"
            />

            <Text className="text-chido-texto-sobre-oscuro text-4xl font-bold text-center w-full mt-4 mb-3">
                ¡Ya estás anotado!
            </Text>
            <Text className="text-chido-texto-secundario-alternativo text-2xl text-center w-full mb-8">
                Estás en la lista de espera. En cuanto el metre te asigne una mesa, vas a poder ingresar.
            </Text>

            <TouchableOpacity
                onPress={verEncuestasPrevias}
                className="bg-chido-acento w-full px-6 py-7 rounded-2xl flex-row items-center justify-center mb-4"
            >
                <Ionicons name="stats-chart-outline" size={36} color={colores.textoSobreOscuro} />
                <Text className="text-chido-texto-sobre-oscuro font-bold text-3xl ml-3 flex-shrink">Ver encuestas anteriores</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={salirDelLocal}
                disabled={saliendo}
                className="bg-chido-cabecera w-full px-6 py-7 rounded-2xl flex-row items-center justify-center"
            >
                <Ionicons name="exit-outline" size={36} color={colores.textoSobreOscuro} />
                <Text className="text-chido-texto-sobre-oscuro font-bold text-3xl ml-3 flex-shrink">{saliendo ? 'Saliendo…' : 'Salir del local'}</Text>
            </TouchableOpacity>
            {!!error && <Text accessibilityLiveRegion="assertive" className="text-chido-texto-sobre-oscuro text-xl font-semibold text-center mt-4">{error}</Text>}
        </View>
    );
}
