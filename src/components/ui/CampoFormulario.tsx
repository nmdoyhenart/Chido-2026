import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

type Props = TextInputProps & { etiqueta: string; error?: string; ayuda?: string };

const CampoFormulario = forwardRef<TextInput, Props>(function CampoFormulario({ etiqueta, error, ayuda, ...props }, ref) {
  return (
    <View className="mb-5 gap-2">
      <Text className="text-white text-lg font-bold">{etiqueta}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={etiqueta}
        accessibilityHint={error ?? ayuda}
        placeholderTextColor="#FED7AA"
        className={`min-h-16 rounded-xl border-2 bg-orange-800 px-4 py-3 text-white text-xl ${error ? 'border-yellow-300' : 'border-orange-300'}`}
        {...props}
      />
      {ayuda && !error && <Text className="text-orange-100 text-base">{ayuda}</Text>}
      {error && <Text className="text-yellow-200 text-base font-bold" accessibilityLiveRegion="polite">{error}</Text>}
    </View>
  );
});

export default CampoFormulario;
