import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAppSession } from '../../contexts/AppSessionContext';
import { Header } from '../../components/Header';
import { colores } from '../../theme/colores';

export default function HomeScreen() {
  const { role, usuario } = useAppSession();
  const router = useRouter();

  const userName = usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Supervisor";
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Supervisor";

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={userName} role={displayRole} />

      <View className="flex-1 p-5 pt-6">
        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro mb-6">
          Hola, {usuario?.nombres || 'Supervisor'}
        </Text>

        <View className="flex-1 gap-4 mb-4">
          <TouchableOpacity 
            onPress={() => router.push('/supervisor/agregar-empleado')}
            className="flex-1 bg-chido-cabecera/70 border-2 border-chido-texto-secundario-alternativo rounded-2xl justify-center items-center flex-row px-6"
          >
            <Ionicons name="person-add-outline" size={32} color={colores.textoSobreOscuro} className="mr-4" />
            <Text className="text-chido-texto-sobre-oscuro font-bold text-xl flex-1 ml-4">Alta de empleado</Text>
            <Ionicons name="chevron-forward" size={24} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/mesas/alta')}
            className="flex-1 bg-chido-cabecera/70 border-2 border-chido-texto-secundario-alternativo rounded-2xl justify-center items-center flex-row px-6"
          >
            <Ionicons name="tablet-landscape-outline" size={32} color={colores.textoSobreOscuro} className="mr-4" />
            <Text className="text-chido-texto-sobre-oscuro font-bold text-xl flex-1 ml-4">Alta de mesa</Text>
            <Ionicons name="chevron-forward" size={24} color={colores.textoSobreOscuro} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/mesas/gestion')}
            className="flex-1 bg-chido-cabecera/70 border-2 border-chido-texto-secundario-alternativo rounded-2xl justify-center items-center flex-row px-6"
          >
            <Ionicons name="grid-outline" size={32} color={colores.textoSobreOscuro} className="mr-4" />
            <View className="flex-1 ml-4">
              <Text className="text-chido-texto-sobre-oscuro font-bold text-xl">Gestión de mesas</Text>
              <Text className="text-chido-texto-secundario-sobre-oscuro text-sm mt-1">12 mesas · 7 disponibles</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-1 bg-chido-cabecera/70 border-2 border-chido-texto-secundario-alternativo rounded-2xl justify-center items-center flex-row px-6"
          >
            <Ionicons name="people-outline" size={32} color={colores.textoSobreOscuro} className="mr-4" />
            <Text className="text-chido-texto-sobre-oscuro font-bold text-xl flex-1 ml-4">Clientes pendientes</Text>
            <View className="bg-chido-notificacion w-8 h-8 rounded-full items-center justify-center">
              <Text className="text-chido-texto-sobre-oscuro font-bold">3</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-1 bg-chido-cabecera/70 border-2 border-chido-texto-secundario-alternativo rounded-2xl justify-center items-center flex-row px-6"
          >
            <Ionicons name="book-outline" size={32} color={colores.textoSobreOscuro} className="mr-4" />
            <Text className="text-chido-texto-sobre-oscuro font-bold text-xl flex-1 ml-4">Ver la carta</Text>
            <Ionicons name="chevron-forward" size={24} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
