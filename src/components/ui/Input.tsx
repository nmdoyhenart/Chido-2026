import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { colores } from '../../theme/colores';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerClassName?: string;
}

export function Input({ label, error, containerClassName = '', ...props }: InputProps) {
  return (
    <View className={`mb-4 ${containerClassName}`}>
      <Text className="text-chido-texto-sobre-oscuro text-sm mb-1 ml-1">{label}</Text>
      <TextInput
        className="bg-chido-cabecera text-chido-texto-sobre-oscuro p-3 rounded-xl border border-chido-acento"
        placeholderTextColor={colores.textoSecundarioSobreOscuro}
        {...props}
      />
      {error ? <Text className="text-chido-error text-sm mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}
