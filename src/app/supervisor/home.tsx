import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAppSession } from '../../contexts/AppSessionContext';
import { Header } from '../../components/Header';
import { SquareButton, ListButton } from '../../components/ui/Buttons';

export default function HomeScreen() {
  const { role } = useAppSession();
  const router = useRouter();

  const userName = "Laura Gauto Morales";
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Supervisor";

  return (
    <View className="flex-1 bg-[#d97736]">
      <Header userName={userName} role={displayRole} />

      <ScrollView className="flex-1 p-5 pt-8">
        <Text className="text-3xl font-bold text-white mb-6">
          Hola, Laura
        </Text>

        <View className="flex-row gap-4 mb-4">
          <SquareButton 
            icon="person-add-outline"
            title="Alta de empleado"
            onPress={() => router.push('/supervisor/agregar-empleado')}
          />
          <SquareButton 
            icon="tablet-landscape-outline"
            title="Alta de mesa"
          />
        </View>

        <ListButton 
          icon="grid-outline"
          title="Gestión de mesas"
          subtitle="12 mesas · 7 disponibles"
        />

        <ListButton 
          icon="people-outline"
          title="Clientes pendientes de aprobación"
          badge={3}
        />

        <ListButton 
          icon="book-outline"
          title="Ver la carta"
        />

      </ScrollView>
    </View>
  );
}