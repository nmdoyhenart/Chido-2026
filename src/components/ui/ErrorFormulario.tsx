import { StyleSheet, Text } from 'react-native';
import { colores } from '../../theme/colores';

export default function ErrorFormulario({ mensaje }: { mensaje: string }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.mensaje}>{mensaje}</Text>;
}

const styles = StyleSheet.create({
  mensaje: {
    color: colores.textoError,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
