import React from "react";
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';

export default function EsperaClienteAnonimo() {

    const salirDelLocal = async () => {
        await AsyncStorage.removeItem(CLIENTE_ANONIMO_ID_KEY);
        router.replace('/(auth)/login');
    };

    return (
        <View className="flex-1 bg-[#d97736] items-center justify-center p-6">
            <Stack.Screen options={{ headerShown: false }} />
            <Ionicons name="checkmark-circle-outline" size={64} color="#fff" />
            <Text className="text-white text-2xl font-bold text-center mt-4 mb-2">
                ¡Ya estás anotado!
            </Text>
            <Text className="text-white text-center mb-10">
                Estás en la lista de espera. En cuanto el metre te asigne una mesa, vas a poder ingresar.
            </Text>

            <TouchableOpacity
                onPress={salirDelLocal}
                className="bg-[#9c5120] px-6 py-4 rounded-2xl"
            >
                <Text className="text-white font-bold text-lg">Salir del local</Text>
            </TouchableOpacity>
        </View>
    )
}