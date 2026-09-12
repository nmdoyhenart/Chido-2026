import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import type { DatosDni } from '../../../shared/registro-cliente';
import { colores } from '../../theme/colores';

type Props = {
  datos: DatosDni;
  onConfirmar: () => void;
  onReintentar: () => void;
  onCancelar: () => void;
};

export default function ConfirmacionDni({ datos, onConfirmar, onReintentar, onCancelar }: Props) {
  const opacidad = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animacion = Animated.timing(opacidad, { toValue: 1, duration: 250, useNativeDriver: true });
    animacion.start();
    return () => animacion.stop();
  }, [opacidad]);

  return <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
    <Animated.View style={{ opacity: opacidad, width: '100%', maxWidth: 440, alignSelf: 'center' }} className="bg-chido-cabecera rounded-3xl border border-chido-texto-secundario-alternativo p-6">
      <View className="self-center bg-chido-exito rounded-full p-4 mb-5">
        <Ionicons name="checkmark" size={44} color={colores.textoSobreOscuro} />
      </View>
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" className="text-chido-texto-sobre-oscuro text-2xl font-extrabold text-center">DNI escaneado correctamente</Text>
      <Text className="text-chido-texto-secundario-sobre-oscuro text-lg text-center mt-3 mb-6">Tomamos los datos de tu documento. Revisalos antes de completar el formulario.</Text>
      <View className="bg-chido-cabecera rounded-2xl p-4 gap-4">
        {([
          ['Nombres', datos.nombres],
          ['Apellidos', datos.apellidos],
          ['DNI', datos.dni],
        ] as const).map(([etiqueta, valor]) => <View key={etiqueta}>
          <Text className="text-chido-texto-secundario-sobre-oscuro text-base">{etiqueta}</Text>
          <Text className="text-chido-texto-sobre-oscuro text-xl font-bold mt-1" selectable>{valor}</Text>
        </View>)}
      </View>
      <Pressable onPress={onConfirmar} accessibilityRole="button" className="bg-chido-exito rounded-xl p-4 mt-6">
        <Text className="text-chido-texto-sobre-oscuro text-lg font-bold text-center">Usar estos datos</Text>
      </Pressable>
      <Pressable onPress={onReintentar} accessibilityRole="button" className="border border-chido-texto-secundario-alternativo rounded-xl p-4 mt-3">
        <Text className="text-chido-texto-sobre-oscuro text-lg font-bold text-center">Volver a escanear</Text>
      </Pressable>
      <Pressable onPress={onCancelar} accessibilityRole="button" className="pt-5 pb-2">
        <Text className="text-chido-texto-secundario-sobre-oscuro text-base text-center underline">Volver al formulario sin usar los datos</Text>
      </Pressable>
    </Animated.View>
  </ScrollView>;
}
