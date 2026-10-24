import React, { useState } from 'react';
import { TextInput, TextInputProps, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { useVibrarError } from '../../hooks/useVibrarError';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerClassName?: string;
  // grande: etiqueta de 18 px y texto de 20 px, pensado para lectura cómoda de personas mayores.
  // Sin margen propio ni alto mínimo: la pantalla que lo usa reparte el espacio y fija la altura del input.
  grande?: boolean;
  // reservarError: el renglón del error ocupa siempre ALTO_ERROR_RESERVADO px, haya error o no,
  // para que al aparecer los avisos la pantalla no cambie de alto. El mensaje se achica para entrar en un renglón.
  reservarError?: boolean;
  // conOjo: con secureTextEntry, agrega un botón con un ojo a la derecha para mostrar u ocultar el texto.
  conOjo?: boolean;
}

export const ALTO_ERROR_RESERVADO = 18;

export function Input({ label, error, containerClassName = '', grande = false, reservarError = false, conOjo = false, ...props }: InputProps) {
  useVibrarError(error);
  const [textoVisible, setTextoVisible] = useState(false);
  const input = (
    <TextInput
      className={`bg-chido-cabecera text-chido-texto-sobre-oscuro rounded-xl border-chido-texto-boton-outline ${grande ? 'border-2 px-4 py-2 text-xl' : 'p-3 border'}`}
      placeholderTextColor={colores.textoSecundarioAlternativo}
      {...props}
      style={conOjo ? [props.style, { paddingRight: 52 }] : props.style}
      secureTextEntry={conOjo ? !!props.secureTextEntry && !textoVisible : props.secureTextEntry}
    />
  );
  return (
    <View className={`${grande ? '' : 'mb-4 '}${containerClassName}`}>
      <Text className={`text-chido-texto-sobre-oscuro ml-1 ${grande ? 'text-lg font-bold mb-1' : 'text-sm mb-1'}`} style={grande ? { lineHeight: 22 } : undefined}>{label}</Text>
      {conOjo ? (
        <View className="justify-center">
          {input}
          <TouchableOpacity
            onPress={() => setTextoVisible(visible => !visible)}
            accessibilityRole="button"
            accessibilityLabel={textoVisible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
            hitSlop={8}
            className="absolute right-0 top-0 bottom-0 w-12 items-center justify-center"
          >
            <Ionicons name={textoVisible ? 'eye-off-outline' : 'eye-outline'} size={26} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
        </View>
      ) : input}
      {reservarError ? (
        <Text
          className="text-chido-error ml-1 text-sm"
          style={{ height: ALTO_ERROR_RESERVADO, lineHeight: ALTO_ERROR_RESERVADO }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {error ?? ''}
        </Text>
      ) : error ? <Text className={`text-chido-error mt-1 ml-1 ${grande ? 'text-base' : 'text-sm'}`}>{error}</Text> : null}
    </View>
  );
}
