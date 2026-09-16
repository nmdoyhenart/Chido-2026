import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppSession } from '../../contexts/AppSessionContext';
import { colores } from '../../theme/colores';

export function useRestriccionSimulacion() {
  const { mode } = useAppSession();
  const [accion, setAccion] = useState<string | null>(null);
  return {
    bloquear: (accionSolicitada: string) => {
      if (mode !== 'simulation') return false;
      setAccion(accionSolicitada);
      return true;
    },
    modal: <Modal transparent animationType="fade" visible={accion !== null} onRequestClose={() => setAccion(null)}>
      <SafeAreaView style={styles.fondo}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <View style={styles.card} accessibilityViewIsModal>
            <Feather name="lock" size={32} color={colores.textoSobreOscuro} />
            <Text style={styles.titulo} accessibilityRole="header">Estás en una simulación</Text>
            <Text style={styles.texto}>Podés recorrer las pantallas, pero no podés {accion} en este modo. Para realizar cambios, ingresá con una cuenta autorizada.</Text>
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} style={styles.boton} onPress={() => setAccion(null)}>
              <Text style={styles.etiqueta}>Seguir explorando</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>,
  };
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(42,20,12,0.82)' },
  contenido: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: colores.superficieTerracota, borderWidth: 1, borderColor: colores.bordeNaranja, borderRadius: 24, padding: 24, gap: 16 },
  titulo: { color: colores.textoSobreOscuro, fontSize: 24, fontWeight: '800' },
  texto: { color: colores.textoSobreOscuro, fontSize: 17, lineHeight: 25 },
  boton: { backgroundColor: colores.botonPrincipal, borderColor: colores.bordeError, borderWidth: 2, borderRadius: 14, padding: 16, minHeight: 52 },
  etiqueta: { color: colores.textoSobreOscuro, textAlign: 'center', fontWeight: '700', fontSize: 17 },
});
