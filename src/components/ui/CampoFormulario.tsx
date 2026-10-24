import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colores } from '../../theme/colores';
import ErrorFormulario from './ErrorFormulario';

// compacto: reduce sólo los márgenes entre campos; la letra mantiene su tamaño.
type Props = TextInputProps & { etiqueta: string; error?: string; ayuda?: string; compacto?: boolean };

const CampoFormulario = forwardRef<TextInput, Props>(function CampoFormulario({ etiqueta, error, ayuda, compacto = false, ...props }, ref) {
  return (
    <View className={compacto ? 'mb-2 gap-1' : 'mb-5 gap-2'}>
      <Text className="text-chido-texto-sobre-oscuro text-lg font-bold">{etiqueta}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={etiqueta}
        accessibilityHint={error ?? ayuda}
        placeholderTextColor={colores.textoSecundarioAlternativo}
        className={`min-h-16 rounded-xl border-2 bg-chido-cabecera px-4 py-3 text-chido-texto-sobre-oscuro text-xl ${error ? 'border-chido-error' : 'border-chido-texto-boton-outline'}`}
        {...props}
        style={[props.style, error ? { borderColor: colores.bordeError } : undefined]}
      />
      {ayuda && !error && <Text className="text-chido-texto-secundario-sobre-oscuro text-base">{ayuda}</Text>}
      {error && <ErrorFormulario mensaje={error} />}
    </View>
  );
});

export default CampoFormulario;
