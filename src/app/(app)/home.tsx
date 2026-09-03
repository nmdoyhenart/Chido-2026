import React from 'react';
import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-orange-700 items-center justify-center px-6">
      <Text className="text-white text-4xl font-extrabold">
        Bienvenido a Chido 🌮
      </Text>

      <Text className="text-yellow-100 text-lg mt-3 text-center">
        El inicio de sesión funcionó correctamente.
      </Text>
    </View>
  );
}