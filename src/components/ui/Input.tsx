import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerClassName?: string;
}

export function Input({ label, error, containerClassName = '', ...props }: InputProps) {
  return (
    <View className={`mb-4 ${containerClassName}`}>
      <Text className="text-white text-sm mb-1 ml-1">{label}</Text>
      <TextInput
        className="bg-[#9c5120] text-white p-3 rounded-xl border border-[#b86127]"
        placeholderTextColor="#e2b99f"
        {...props}
      />
      {error ? <Text className="text-red-300 text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}

