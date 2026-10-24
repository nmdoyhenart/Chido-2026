import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppSession } from "../../contexts/AppSessionContext";
import { colores } from "../../theme/colores";

type CerrarSesionButtonProps = {
  className?: string;
  variante?: "predeterminada" | "mesas";
  soloIcono?: boolean;
};

export function CerrarSesionButton({ className = "", variante = "predeterminada", soloIcono = false }: CerrarSesionButtonProps) {
  const { cerrarSesion: finalizarSesion } = useAppSession();
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mesas = variante === "mesas";
  const botonSecundario = mesas ? "border-chido-texto-secundario-sobre-oscuro bg-chido-acento" : "border-chido-texto-secundario-alternativo/40 bg-chido-cabecera/70";
  const texto = mesas ? "text-chido-texto-sobre-oscuro" : "text-chido-texto-sobre-oscuro";
  const textoSecundario = mesas ? "text-chido-texto-secundario-sobre-oscuro" : "text-chido-texto-secundario-sobre-oscuro";

  async function cerrarSesion() {
    setCerrando(true);
    try {
      await finalizarSesion();
      router.dismissTo("/(auth)/login");
    } catch {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // El aviso continúa siendo necesario sin hápticos.
      }
      setError("No se pudo cerrar la sesión. Verificá la conexión e intentá nuevamente.");
    } finally {
      setCerrando(false);
      setConfirmando(false);
    }
  }

  return (
    <>
      <Pressable
        className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 ${botonSecundario} ${className}`}
        accessibilityRole="button"
        accessibilityLabel={soloIcono ? "Cerrar sesión" : undefined}
        onPress={() => setConfirmando(true)}
      >
        <Ionicons name="log-out-outline" size={22} color={mesas ? colores.textoSobreOscuro : colores.textoSecundarioAlternativo} />
        {!soloIcono ? <Text className={`text-center font-bold ${texto}`}>Cerrar sesión</Text> : null}
      </Pressable>

      <Modal visible={confirmando || cerrando || error !== null} transparent animationType="fade" onRequestClose={() => !cerrando && setConfirmando(false)}>
        <View className="flex-1 items-center justify-center p-5" style={{ backgroundColor: 'rgba(42,20,12,0.78)' }}>
          <View style={styles.panel} accessibilityViewIsModal>
            {cerrando ? (
              <View className="items-center">
                <Image source={require("../../../assets/images/logo.png")} style={{ width: 96, height: 96 }} resizeMode="contain" />
                <ActivityIndicator className="mt-4" size="large" color={mesas ? colores.textoSobreOscuro : colores.textoSecundarioAlternativo} />
                <Text className={`mt-3 text-center text-lg font-bold ${texto}`}>Cerrando sesión</Text>
              </View>
            ) : error ? (
              <>
                <Text className={`text-center text-xl font-bold ${texto}`}>No se pudo cerrar la sesión</Text>
                <Text className={`mt-3 text-center text-base ${textoSecundario}`}>{error}</Text>
                <TouchableOpacity style={[styles.boton, styles.principal, { marginTop: 20 }]} activeOpacity={0.8} accessibilityRole="button" onPress={() => setError(null)}><Text style={styles.etiqueta}>Entendido</Text></TouchableOpacity>
              </>
            ) : (
              <>
                <Text className={`text-center text-xl font-bold ${texto}`}>Cerrar sesión</Text>
                <Text className={`mt-3 text-center text-base ${textoSecundario}`}>Se borrarán las credenciales guardadas y volverás a elegir un acceso.</Text>
                <View className="mt-5 flex-row gap-3">
                  <TouchableOpacity style={[styles.boton, styles.cancelar, { flex: 1 }]} activeOpacity={0.8} accessibilityRole="button" onPress={() => setConfirmando(false)}><Text style={styles.etiqueta}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.boton, styles.principal, { flex: 1 }]} activeOpacity={0.8} accessibilityRole="button" onPress={() => void cerrarSesion()}><Text style={styles.etiqueta}>Cerrar sesión</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colores.cabecera, borderRadius: 28, borderWidth: 1, borderColor: colores.bordeNaranja, padding: 26 },
  boton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, padding: 16 },
  principal: { backgroundColor: colores.botonPrincipal, borderColor: colores.textoSecundarioSobreOscuro },
  cancelar: { backgroundColor: colores.acento, borderColor: colores.bordeNaranja },
  etiqueta: { color: colores.textoSobreOscuro, fontSize: 17, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
});
