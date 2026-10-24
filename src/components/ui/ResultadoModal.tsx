import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores } from '../../theme/colores';
import { vibrarError } from '../../utils/errorVibration';

type Props = {
  visible: boolean;
  tipo: 'exito' | 'error';
  titulo: string;
  mensaje: string;
  accion: string;
  onClose: () => void;
};

export function ResultadoModal({ visible, tipo, titulo, mensaje, accion, onClose }: Props) {
  const exito = tipo === 'exito';
  useEffect(() => {
    if (visible && !exito) vibrarError();
  }, [visible, exito, titulo, mensaje]);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.fondo}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <View style={styles.tarjeta} accessibilityViewIsModal>
            <View style={[styles.icono, { borderColor: exito ? colores.activo : colores.bordeError }]}>
              <Ionicons name={exito ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={48} color={exito ? colores.activo : colores.bordeError} />
            </View>
            <Text style={styles.titulo} accessibilityRole="header">{titulo}</Text>
            <Text style={styles.mensaje} accessibilityLiveRegion="polite">{mensaje}</Text>
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} style={styles.boton} onPress={onClose}>
              <Text style={styles.etiqueta}>{accion}</Text>
              <Ionicons name={exito ? 'arrow-forward' : 'create-outline'} size={21} color={colores.textoSobreOscuro} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(42,20,12,0.75)' },
  contenido: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  tarjeta: { width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colores.cabecera, borderRadius: 28, borderWidth: 1, borderColor: colores.bordeNaranja, padding: 26, gap: 18 },
  icono: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: 40, borderWidth: 1, backgroundColor: colores.superficieTerracota },
  titulo: { color: colores.textoSobreOscuro, fontSize: 25, fontWeight: '800', textAlign: 'center' },
  mensaje: { color: colores.textoSecundarioSobreOscuro, fontSize: 17, lineHeight: 25, textAlign: 'center' },
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 54, marginTop: 8, padding: 16, borderRadius: 16, backgroundColor: colores.botonPrincipal, borderWidth: 1, borderColor: colores.textoSecundarioSobreOscuro },
  etiqueta: { flexShrink: 1, color: colores.textoSobreOscuro, fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
