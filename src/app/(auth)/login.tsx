import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function PantallaLogin() {
  return (
    <View className="flex-1 items-center justify-center bg-zinc-900 p-6">
      <Text className="text-3xl font-bold text-white mb-8">
        Ingreso Rápido
      </Text>
      
      <Text className="text-zinc-400 text-center mb-8">
        Aquí pondremos los botones fijos para:{"\n"}
        Dueño, Supervisor, Metre, Mozo, Cocinero, Cantinero, y Clientes.
      </Text>

      {/* Ejemplo de un botón temporal */}
      <TouchableOpacity className="bg-yellow-500 w-full p-4 rounded-xl items-center">
        <Text className="text-zinc-900 font-bold text-lg">
          Simular Ingreso Dueño
        </Text>
      </TouchableOpacity>
    </View>
  );
}