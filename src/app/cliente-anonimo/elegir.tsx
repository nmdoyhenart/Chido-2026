import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { anotarseEnListaDeEspera, obtenerClienteEnListaPorId} from '../../../lib/clientesAnonimos';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';
const CLIENTE_ANONIMO_NOMBRE_KEY = 'cliente_anonimo_nombre';
const CLIENTE_ANONIMO_FOTO_KEY = 'cliente_anonimo_foto_url';

export default function ElegirOpcion() {
    const [anotando, setAnotando] = useState(false);
    const [error, setError] = useState('');

    const anotarme = async () => {
        setError('');
        setAnotando(true);
        try {
            const identificador = await AsyncStorage.getItem(CLIENTE_ANONIMO_ID_KEY);
            const nombre = await AsyncStorage.getItem(CLIENTE_ANONIMO_NOMBRE_KEY);
            const fotoUrl = await AsyncStorage.getItem(CLIENTE_ANONIMO_FOTO_KEY);

            if (!identificador || !nombre || !fotoUrl) {
                setError('Faltan tus datos, volvé a registrarte.');
                return;
            }

            const yaAnotado = await obtenerClienteEnListaPorId(identificador);
            if (!yaAnotado) {
                await anotarseEnListaDeEspera({ identificador, nombre, fotoUrl });
            }

            router.push('/cliente-anonimo/espera');
        } catch (err) {
            console.error(err);
            setError('No se pudo completar la acción. Intentá de nuevo.');
        } finally {
            setAnotando(false);
        }
    };

    const verEncuestas = () => {
        router.push('/encuestas/previas');
    };

    return (
        <View className="flex-1 bg-chido-fondo items-center justify-center px-6">
            <Stack.Screen options={{ headerShown: false }} />

            <Text className="text-chido-texto-sobre-oscuro text-3xl font-bold text-center mb-10">
                ¿Qué querés hacer?
            </Text>

            <TouchableOpacity
                onPress={anotarme}
                disabled={anotando}
                className="bg-chido-cabecera w-full px-8 py-6 rounded-2xl flex-row items-center justify-center mb-4"
            >
                {anotando ? (
                    <ActivityIndicator color={colores.textoSobreOscuro} />
                ) : (
                    <>
                        <Ionicons name="list-outline" size={28} color={colores.textoSobreOscuro} />
                        <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">Anotarme a la lista de espera</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={verEncuestas}
                className="bg-chido-acento w-full px-8 py-6 rounded-2xl flex-row items-center justify-center"
            >
                <Ionicons name="stats-chart-outline" size={28} color={colores.textoSobreOscuro} />
                <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">Ver encuestas anteriores</Text>
            </TouchableOpacity>

            {error !== '' && (
                <Text className="text-chido-notificacion text-lg text-center mt-6 px-6 font-semibold">
                    {error}
                </Text>
            )}
        </View>
    );
}