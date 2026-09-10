import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SquareButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress?: () => void;
}

export function SquareButton({ icon, title, onPress }: SquareButtonProps) {
  return (
    <TouchableOpacity 
      className="flex-1 bg-[#b35e25] rounded-2xl p-5 min-h-[140px] justify-between"
      onPress={onPress}
    >
      <View className="w-12 h-12 bg-[#9c5120] rounded-xl items-center justify-center">
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <Text className="text-white font-bold text-lg mt-2 leading-tight">
        {title}
      </Text>
    </TouchableOpacity>
  );
}

interface ListButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badge?: number;
  onPress?: () => void;
}

export function ListButton({ icon, title, subtitle, badge, onPress }: ListButtonProps) {
  return (
    <TouchableOpacity 
      className="bg-[#b35e25] rounded-2xl p-5 mb-4 flex-row items-center justify-between"
      onPress={onPress}
    >
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 bg-[#9c5120] rounded-xl items-center justify-center mr-4">
          <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-white font-bold text-lg leading-tight">{title}</Text>
          {subtitle && (
            <Text className="text-[#e2b99f] text-sm mt-1">{subtitle}</Text>
          )}
        </View>
      </View>
      {badge !== undefined ? (
        <View className="bg-red-500 w-8 h-8 rounded-full items-center justify-center">
          <Text className="text-white font-bold text-sm">{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      )}
    </TouchableOpacity>
  );
}

interface PrimaryButtonProps {
  title: string;
  onPress?: () => void;
  className?: string;
  isLoading?: boolean;
}

export function PrimaryButton({ title, onPress, className = "", isLoading }: PrimaryButtonProps) {
  return (
    <TouchableOpacity 
      className={`bg-[#7a2e1f] p-4 rounded-xl items-center flex-row justify-center ${className}`}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <Text className="text-white font-bold text-lg">Guardando...</Text>
      ) : (
        <Text className="text-white font-bold text-lg">{title}</Text>
      )}
    </TouchableOpacity>
  );
}
