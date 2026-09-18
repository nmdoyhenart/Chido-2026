import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';

interface SquareButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress?: () => void;
}

export function SquareButton({ icon, title, onPress }: SquareButtonProps) {
  return (
    <TouchableOpacity
      className="flex-1 bg-chido-acento rounded-2xl p-5 min-h-[140px] justify-between"
      onPress={onPress}
    >
      <View className="w-12 h-12 bg-chido-cabecera rounded-xl items-center justify-center">
        <Ionicons name={icon} size={24} color={colores.textoSobreOscuro} />
      </View>
      <Text className="text-chido-texto-sobre-oscuro font-bold text-lg mt-2 leading-tight">
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
      className="bg-chido-acento rounded-2xl p-5 mb-4 flex-row items-center justify-between"
      onPress={onPress}
    >
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 bg-chido-cabecera rounded-xl items-center justify-center mr-4">
          <Ionicons name={icon} size={24} color={colores.textoSobreOscuro} />
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-chido-texto-sobre-oscuro font-bold text-lg leading-tight">{title}</Text>
          {subtitle && (
            <Text className="text-chido-texto-secundario-sobre-oscuro text-sm mt-1">{subtitle}</Text>
          )}
        </View>
      </View>
      {badge !== undefined ? (
        <View className="bg-chido-notificacion w-8 h-8 rounded-full items-center justify-center">
          <Text className="text-chido-texto-sobre-oscuro font-bold text-sm">{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colores.textoSobreOscuro} />
      )}
    </TouchableOpacity>
  );
}

interface PrimaryButtonProps {
  title: string;
  onPress?: () => void;
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({ title, onPress, className = "", isLoading, disabled }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      className={`bg-chido-cabecera p-4 rounded-xl items-center flex-row justify-center ${disabled ? 'opacity-50' : ''} ${className}`}
      onPress={onPress}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <Text className="text-chido-texto-sobre-oscuro font-bold text-lg">Guardando...</Text>
      ) : (
        <Text className="text-chido-texto-sobre-oscuro font-bold text-lg">{title}</Text>
      )}
    </TouchableOpacity>
  );
}
