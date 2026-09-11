import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSession } from '../contexts/AppSessionContext';

interface HeaderProps {
  userName: string;
  role: string;
}

export function Header({ userName, role }: HeaderProps) {
  const { clearSession } = useAppSession();
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    router.replace('/');
  };

  return (
    <View className="bg-[#9c5120] px-4 pt-12 pb-4 flex-row items-center justify-between">
      {/* Profile Info */}
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-[#c87640] items-center justify-center border border-[#e58a50] mr-3">
          <Ionicons name="person" size={24} color="#fff" />
        </View>
        <View>
          <Text className="text-white font-bold text-lg">{userName}</Text>
          <View className="bg-[#b35e25] px-2 py-0.5 rounded-full flex-row items-center self-start mt-1">
            <View className="w-2 h-2 rounded-full bg-green-400 mr-1" />
            <Text className="text-white text-xs">{role}</Text>
          </View>
        </View>
      </View>
      
      {/* Actions */}
      <View className="flex-row items-center gap-2">
        <TouchableOpacity className="w-10 h-10 rounded-full bg-[#b35e25] items-center justify-center">
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          {/* Notification dot */}
          <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
        </TouchableOpacity>
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-[#b35e25] items-center justify-center"
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

