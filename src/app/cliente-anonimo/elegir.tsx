import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { anotarseEnListaDeEspera, obtenerClienteEnListaPorId} from '../../../lib/clientesAnonimos';
import { useVibrarError } from '../../hooks/useVibrarError';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';
const CLIENTE_ANONIMO_NOMBRE_KEY = 'cliente_anonimo_nombre';
const CLIENTE_ANONIMO_FOTO_KEY = 'cliente_anonimo_foto_url';

export default function ElegirOpcion() {
    const [anotando, setAnotando] = useState(false);
    const [error, setError] = useState('');
    useVibrarError(error);
    const insets = useSafeAreaInsets();

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
        router.push('/encuestas/acceso');
    };

    return (
        <SafeAreaView className="flex-1 bg-chido-fondo" edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* El paddingBottom deja los botones por encima de la barra de navegación de Android */}
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>

                {/* La mascota toma el espacio que sobra y se achica en pantallas chicas para que todo entre sin scroll */}
                <Image
                    source={require('../../../assets/images/mascota-pensando.png')}
                    style={{ flex: 1, width: '90%', minHeight: 0, alignSelf: 'center', marginBottom: 8 }}
                    resizeMode="contain"
                />

                <Text className="text-chido-texto-sobre-oscuro text-4xl font-bold text-center mt-2 mb-6 w-full">
                    ¿Qué querés hacer?
                </Text>

                <TouchableOpacity
                    onPress={anotarme}
                    disabled={anotando}
                    className="bg-chido-cabecera w-full px-6 py-8 rounded-2xl flex-row items-center justify-center mb-4"
                >
                    {anotando ? (
                        <ActivityIndicator size="large" color={colores.textoSobreOscuro} />
                    ) : (
                        <>
                            <Ionicons name="list-outline" size={36} color={colores.textoSobreOscuro} />
                            <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-3 flex-shrink">Anotarme a la lista de espera</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={verEncuestas}
                    className="bg-chido-acento w-full px-6 py-8 rounded-2xl flex-row items-center justify-center"
                >
                    <Ionicons name="stats-chart-outline" size={36} color={colores.textoSobreOscuro} />
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-3 flex-shrink">Ver encuestas anteriores</Text>
                </TouchableOpacity>

                {/* Fondo bordó oscuro con texto claro para que el error se lea bien sobre el fondo naranja */}
                {error !== '' && (
                    <View className="bg-chido-error w-full mt-4 px-5 py-4 rounded-2xl flex-row items-center">
                        <Ionicons name="alert-circle" size={32} color={colores.textoSobreOscuro} />
                        <Text className="text-chido-texto-sobre-oscuro text-xl font-bold ml-3 flex-1">
                            {error}
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}
