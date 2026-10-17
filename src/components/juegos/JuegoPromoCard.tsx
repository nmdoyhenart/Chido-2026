import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { colores } from '../../theme/colores';

type JuegoPromoCardProps = {
  titulo: string;
  descuento: string;
  icono: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  compacto?: boolean;
};

// Fuente única de presentación para las promociones de juegos del cliente.
// Ocupa una parte igual del alto disponible para que la lista entre sin scroll.
export function JuegoPromoCard({ titulo, descuento, icono, onPress, compacto = false }: JuegoPromoCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, descuento de ${descuento}`}
      style={{ flexGrow: 1, flexBasis: 0 }}
      className={`justify-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera ${compacto ? 'px-5 py-2' : 'p-5'}`}
    >
      <View className="flex-row items-center justify-between">
        <Ionicons name={icono} size={compacto ? 36 : 48} color={colores.textoSobreOscuro} />
        <View className={`rounded-full bg-chido-acento ${compacto ? 'px-4 py-1.5' : 'px-5 py-3'}`}>
          <Text className={`${compacto ? 'text-xl' : 'text-2xl'} font-extrabold text-chido-texto-sobre-oscuro`}>{descuento}</Text>
        </View>
      </View>
      <Text className={`${compacto ? 'mt-1' : 'mt-5'} font-extrabold text-chido-texto-sobre-oscuro`} style={compacto ? { fontSize: 28, lineHeight: 34 } : { fontSize: 36, lineHeight: 44 }}>
        {titulo}
      </Text>
    </Pressable>
  );
}
