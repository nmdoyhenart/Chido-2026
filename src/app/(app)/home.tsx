import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';

import { useAppSession } from '../../contexts/AppSessionContext';

export default function HomeScreen() {
  const { mode, role } = useAppSession();

  return (
    <View className="flex-1 items-center justify-center bg-orange-700 px-6">

      <Text className="text-white text-4xl font-extrabold text-center">
        Bienvenido a Chido 🌮
      </Text>

      <Text className="text-yellow-100 text-lg mt-4 text-center">
        Modo actual:
      </Text>

      <Text className="text-white text-2xl font-bold mt-2">
        {mode}
      </Text>

      <Text className="text-yellow-100 text-lg mt-6 text-center">
        Rol actual:
      </Text>

      <Text className="text-white text-3xl font-extrabold mt-2 capitalize">
        {role ?? 'sin rol'}
      </Text>

      {role === 'cocina' && (
        <View className="w-full mt-10 gap-4">
          <Link href="/productos/alta" asChild>
            <Pressable className="bg-orange-950 p-4 rounded-2xl items-center">
              <Text className="text-white font-bold text-lg">Alta de plato</Text>
            </Pressable>
          </Link>

          <Link href="/productos/alta-bebida" asChild>
            <Pressable className="bg-orange-950 p-4 rounded-2xl items-center">
              <Text className="text-white font-bold text-lg">Alta de bebida</Text>
            </Pressable>
          </Link>
        </View>
      )}

    </View>
  );
}