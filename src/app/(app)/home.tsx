import React from 'react';
import { View, Text } from 'react-native';

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

    </View>
  );
}