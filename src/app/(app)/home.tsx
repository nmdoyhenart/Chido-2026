import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAppSession } from '../../contexts/AppSessionContext';
import { CerrarSesionButton } from '../../components/auth/CerrarSesionButton';
import { puedeAdministrarMesas, puedeDarAltaEmpleado, puedeDarAltaProducto } from '../../utils/permisos';

export default function HomeScreen() {
  const { mode, role } = useAppSession();
  const administraMesas = puedeAdministrarMesas(role);
  const puedeAgregarEmpleado = puedeDarAltaEmpleado(role);
  const puedeAgregarProducto = puedeDarAltaProducto(role);

  return (
    <SafeAreaView className="flex-1 bg-orange-700">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="items-center justify-center px-6 py-8">
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

          {administraMesas ? <Pressable
            onPress={() => router.push('/mesas/gestion')}
            accessibilityRole="button"
            accessibilityLabel="Mesas: gestión y códigos QR"
            className="mt-8 w-full flex-row items-center justify-center gap-3 rounded-2xl border-2 border-orange-100/40 bg-red-900 px-5 py-5"
          >
            <Ionicons name="restaurant-outline" size={28} color="#FFE4C7" />
            <Text className="shrink text-center text-white text-xl font-extrabold">Mesas</Text>
          </Pressable> : null}

          {puedeAgregarEmpleado ? <Pressable
            onPress={() => router.push('/agregar-empleado')}
            accessibilityRole="button"
            className="mt-4 w-full flex-row items-center justify-center gap-3 rounded-2xl border-2 border-orange-100/40 bg-red-900/70 px-5 py-5"
          >
            <Ionicons name="person-add-outline" size={28} color="#FFE4C7" />
            <Text className="shrink text-center text-white text-xl font-extrabold">Agregar empleado</Text>
          </Pressable> : null}

          {puedeAgregarProducto ? <Pressable
            onPress={() => router.push('/productos/alta')}
            accessibilityRole="button"
            className="mt-4 w-full flex-row items-center justify-center gap-3 rounded-2xl border-2 border-orange-100/40 bg-red-900 px-5 py-5"
          >
            <Ionicons name="restaurant-outline" size={28} color="#FFE4C7" />
            <Text className="shrink text-center text-white text-xl font-extrabold">Agregar producto</Text>
          </Pressable> : null}

          <CerrarSesionButton className="mt-4 w-full" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
