import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { colores } from '../../theme/colores';

type JuegoPromoCardProps = {
  titulo: string;
  descuento: string;
  icono: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

// Fuente única de presentación para las promociones de juegos del cliente.
export function JuegoPromoCard({ titulo, descuento, icono, onPress }: JuegoPromoCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, descuento de ${descuento}`}
      className="min-h-40 rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-5"
    >
      <View className="flex-row items-center justify-between">
        <Ionicons name={icono} size={48} color={colores.textoSobreOscuro} />
        <View className="rounded-full bg-chido-acento px-5 py-3">
          <Text className="text-2xl font-extrabold text-chido-texto-sobre-oscuro">{descuento}</Text>
        </View>
      </View>
      <Text className="mt-5 font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 36, lineHeight: 44 }}>
        {titulo}
      </Text>
    </Pressable>
  );
}
