import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from "react-native";
import { useAppSession } from "../../contexts/AppSessionContext";
import { authService } from "../../services/auth.service";

type CerrarSesionButtonProps = {
  className?: string;
};

export function CerrarSesionButton({ className = "" }: CerrarSesionButtonProps) {
  const { clearSession } = useAppSession();
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        className={`min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-orange-100/40 bg-red-900/70 px-4 py-2 ${className}`}
        accessibilityRole="button"
        onPress={() => setConfirmando(true)}
      >
        <Ionicons name="log-out-outline" size={22} color="#FFE4C7" />
        <Text className="text-center font-bold text-yellow-50">Cerrar sesión</Text>
      </Pressable>

      <Modal visible={confirmando || cerrando || error !== null} transparent animationType="fade" onRequestClose={() => !cerrando && setConfirmando(false)}>
        <View className="flex-1 items-center justify-center bg-orange-800/90 p-5">
          <View className="w-full max-w-md rounded-3xl border-2 border-orange-100/40 bg-red-900/70 p-6">
            {cerrando ? (
              <View className="items-center">
                <Image source={require("../../../assets/images/logo.png")} style={{ width: 96, height: 96 }} resizeMode="contain" />
                <ActivityIndicator className="mt-4" size="large" color="#FFE4C7" />
                <Text className="mt-3 text-center text-lg font-bold text-yellow-50">Cerrando sesión</Text>
              </View>
            ) : error ? (
              <>
                <Text className="text-center text-xl font-bold text-yellow-50">No se pudo cerrar la sesión</Text>
                <Text className="mt-3 text-center text-base text-yellow-100">{error}</Text>
                <Pressable className="mt-5 rounded-2xl bg-red-900 p-4" accessibilityRole="button" onPress={() => setError(null)}><Text className="text-center text-lg font-bold text-white">Entendido</Text></Pressable>
              </>
            ) : (
              <>
                <Text className="text-center text-xl font-bold text-yellow-50">Cerrar sesión</Text>
                <Text className="mt-3 text-center text-base text-yellow-100">Se borrarán las credenciales guardadas y volverás a elegir un acceso.</Text>
                <View className="mt-5 flex-row gap-3">
                  <Pressable className="flex-1 rounded-2xl border-2 border-orange-100/40 bg-red-900/70 p-4" accessibilityRole="button" onPress={() => setConfirmando(false)}><Text className="text-center font-bold text-yellow-50">Cancelar</Text></Pressable>
                  <Pressable className="flex-1 rounded-2xl bg-red-900 p-4" accessibilityRole="button" onPress={() => void cerrarSesion()}><Text className="text-center font-bold text-white">Cerrar sesión</Text></Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
