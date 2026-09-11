import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from "react-native";
import { useAppSession } from "../../contexts/AppSessionContext";
import { authService } from "../../services/auth.service";

type CerrarSesionButtonProps = {
  className?: string;
  variante?: "predeterminada" | "mesas";
  soloIcono?: boolean;
};

export function CerrarSesionButton({ className = "", variante = "predeterminada", soloIcono = false }: CerrarSesionButtonProps) {
  const { clearSession } = useAppSession();
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mesas = variante === "mesas";
  const botonSecundario = mesas ? "border-[#e6b18c] bg-[#b35e25]" : "border-orange-100/40 bg-red-900/70";
  const botonPrincipal = mesas ? "bg-[#9c5120]" : "bg-red-900";
  const panel = mesas ? "border-[#e6b18c] bg-[#b35e25]" : "border-orange-100/40 bg-red-900/70";
  const texto = mesas ? "text-[#fff4ea]" : "text-yellow-50";
  const textoSecundario = mesas ? "text-[#f2c4a8]" : "text-yellow-100";

  async function cerrarSesion() {
    setCerrando(true);
    try {
      await authService.logout();
      clearSession();
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
        <Ionicons name="log-out-outline" size={22} color={mesas ? "#fff4ea" : "#FFE4C7"} />
        {!soloIcono ? <Text className={`text-center font-bold ${texto}`}>Cerrar sesión</Text> : null}
      </Pressable>

      <Modal visible={confirmando || cerrando || error !== null} transparent animationType="fade" onRequestClose={() => !cerrando && setConfirmando(false)}>
        <View className={`flex-1 items-center justify-center p-5 ${mesas ? "bg-[#d97736]" : "bg-orange-800/90"}`}>
          <View className={`w-full max-w-md rounded-3xl border-2 p-6 ${panel}`}>
            {cerrando ? (
              <View className="items-center">
                <Image source={require("../../../assets/images/logo.png")} style={{ width: 96, height: 96 }} resizeMode="contain" />
                <ActivityIndicator className="mt-4" size="large" color={mesas ? "#fff4ea" : "#FFE4C7"} />
                <Text className={`mt-3 text-center text-lg font-bold ${texto}`}>Cerrando sesión</Text>
              </View>
            ) : error ? (
              <>
                <Text className={`text-center text-xl font-bold ${texto}`}>No se pudo cerrar la sesión</Text>
                <Text className={`mt-3 text-center text-base ${textoSecundario}`}>{error}</Text>
                <Pressable className={`mt-5 rounded-xl p-4 ${botonPrincipal}`} accessibilityRole="button" onPress={() => setError(null)}><Text className="text-center text-lg font-bold text-white">Entendido</Text></Pressable>
              </>
            ) : (
              <>
                <Text className={`text-center text-xl font-bold ${texto}`}>Cerrar sesión</Text>
                <Text className={`mt-3 text-center text-base ${textoSecundario}`}>Se borrarán las credenciales guardadas y volverás a elegir un acceso.</Text>
                <View className="mt-5 flex-row gap-3">
                  <Pressable className={`flex-1 rounded-xl border-2 p-4 ${botonSecundario}`} accessibilityRole="button" onPress={() => setConfirmando(false)}><Text className={`text-center font-bold ${texto}`}>Cancelar</Text></Pressable>
                  <Pressable className={`flex-1 rounded-xl p-4 ${botonPrincipal}`} accessibilityRole="button" onPress={() => void cerrarSesion()}><Text className="text-center font-bold text-white">Cerrar sesión</Text></Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
