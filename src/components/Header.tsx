import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSession } from '../contexts/AppSessionContext';
import { colores } from '../theme/colores';

interface HeaderProps {
  userName: string;
  role: string;
}

export function Header({ userName, role }: HeaderProps) {
  const { cerrarSesion } = useAppSession();
  const router = useRouter();

  const handleLogout = () => {
    cerrarSesion();
    router.replace('/');
  };

  return (
    <View className="bg-chido-cabecera px-4 pt-12 pb-4 flex-row items-center justify-between">
      {/* Profile Info */}
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-chido-fondo items-center justify-center border border-chido-acento mr-3">
          <Ionicons name="person" size={24} color={colores.textoSobreOscuro} />
        </View>
        <View>
          <Text className="text-chido-texto-sobre-oscuro font-bold text-lg">{userName}</Text>
          <View className="bg-chido-acento px-2 py-0.5 rounded-full flex-row items-center self-start mt-1">
            <View className="w-2 h-2 rounded-full bg-chido-activo mr-1" />
            <Text className="text-chido-texto-sobre-oscuro text-xs">{role}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row items-center gap-2">
        <TouchableOpacity className="w-10 h-10 rounded-full bg-chido-acento items-center justify-center">
          <Ionicons name="notifications-outline" size={20} color={colores.textoSobreOscuro} />
          {/* Notification dot */}
          <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-chido-notificacion" />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-chido-acento items-center justify-center"
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colores.textoSobreOscuro} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
