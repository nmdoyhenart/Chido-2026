import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { colores } from '../../theme/colores';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerClassName?: string;
  // grande: etiqueta de 18 px y texto de 20 px, pensado para lectura cómoda de personas mayores.
  // Sin margen propio ni alto mínimo: la pantalla que lo usa reparte el espacio y fija la altura del input.
  grande?: boolean;
}

export function Input({ label, error, containerClassName = '', grande = false, ...props }: InputProps) {
  return (
    <View className={`${grande ? '' : 'mb-4 '}${containerClassName}`}>
      <Text className={`text-chido-texto-sobre-oscuro ml-1 ${grande ? 'text-lg font-bold mb-1' : 'text-sm mb-1'}`} style={grande ? { lineHeight: 22 } : undefined}>{label}</Text>
      <TextInput
        className={`bg-chido-cabecera text-chido-texto-sobre-oscuro rounded-xl border-chido-texto-boton-outline ${grande ? 'border-2 px-4 py-2 text-xl' : 'p-3 border'}`}
        placeholderTextColor={colores.textoSecundarioAlternativo}
        {...props}
      />
      {error ? <Text className={`text-chido-error mt-1 ml-1 ${grande ? 'text-base' : 'text-sm'}`}>{error}</Text> : null}
    </View>
  );
}
