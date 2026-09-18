import React from "react";
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';

export default function EsperaClienteAnonimo() {

    const salirDelLocal = async () => {
        await AsyncStorage.removeItem(CLIENTE_ANONIMO_ID_KEY);
        router.replace('/(auth)/login');
    };

    const verEncuestasPrevias = () => {
        router.push('/encuestas/previas');
    };

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
                className="bg-chido-cabecera w-full px-8 py-6 rounded-2xl flex-row items-center justify-center"
            >
                <Ionicons name="exit-outline" size={28} color={colores.textoSobreOscuro} />
                <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">Salir del local</Text>
            </TouchableOpacity>
        </View>
    )
}