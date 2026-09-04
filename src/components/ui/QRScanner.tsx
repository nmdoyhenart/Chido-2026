import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import type { PropositoScannerQr } from "../../types/qr";

type QRScannerProps = {
  visible: boolean;
  proposito: PropositoScannerQr;
  onScan: (raw: string) => Promise<void> | void;
  onClose: () => void;
};

const instrucciones: Record<PropositoScannerQr, string> = {
  dni: "Apuntá al código PDF417 del DNI.",
  ingreso: "Apuntá al código QR de ingreso al local.",
  mesa: "Apuntá al código QR de la mesa asignada.",
  propina: "Apuntá al código QR de la propina elegida.",
};

export function QRScanner({
  visible,
  proposito,
  onScan,
  onClose,
}: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setProcessing(false);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const vibrarExito = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Los dispositivos que no admiten hápticos no deben invalidar el escaneo.
    }
  };

  const vibrarError = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Los dispositivos que no admiten hápticos no deben ocultar el error.
    }
  };

  const handleScan = async (raw: string) => {
    if (processing) return;

    setProcessing(true);
    setError(null);

    try {
      await onScan(raw);
      await vibrarExito();
      close();
    } catch (caughtError) {
      await vibrarError();
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo procesar el código leído.",
      );
      setProcessing(false);
    }
  };

  const requestCameraPermission = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      await vibrarError();
      setError("Se requiere permiso para usar la cámara.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View className="flex-1 bg-[#f97316] px-5 pb-8 pt-14">
        <Text className="text-center text-3xl font-bold text-white">
          Escanear código
        </Text>
        <Text className="mb-6 mt-2 text-center text-base text-white">
          {instrucciones[proposito]}
        </Text>

        {!permission || !permission.granted ? (
          <View className="flex-1 justify-center rounded-3xl bg-[#ea580c] p-6">
            <Text className="mb-6 text-center text-lg font-semibold text-white">
              Se necesita permiso para acceder a la cámara.
            </Text>
            <Pressable
              className="rounded-2xl bg-[#fb923c] p-4"
              onPress={requestCameraPermission}
            >
              <Text className="text-center text-lg font-bold text-white">
                Dar permiso de cámara
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-1 overflow-hidden rounded-3xl border-4 border-[#fed7aa]">
            <CameraView
              className="flex-1"
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: proposito === "dni" ? ["pdf417"] : ["qr"],
              }}
              onBarcodeScanned={processing ? undefined : ({ data }) => handleScan(data)}
            />
          </View>
        )}

        {error ? (
          <View className="mt-5 rounded-2xl bg-[#facc15] p-4">
            <Text className="text-center font-semibold text-[#9a3412]">{error}</Text>
          </View>
        ) : null}

        <View className="mt-5 gap-3">
          {error ? (
            <Pressable className="rounded-2xl bg-[#fb923c] p-4" onPress={reset}>
              <Text className="text-center text-lg font-bold text-white">
                Escanear nuevamente
              </Text>
            </Pressable>
          ) : null}
          <Pressable className="rounded-2xl bg-[#ea580c] p-4" onPress={close}>
            <Text className="text-center text-lg font-bold text-white">Cancelar</Text>
          </Pressable>
        </View>

        {processing ? (
          <View className="absolute inset-0 items-center justify-center bg-[#ea580c]/95 px-8">
            <Image
              source={require("../../../assets/images/icon.png")}
              className="mb-5 h-24 w-24 rounded-3xl"
            />
            <ActivityIndicator size="large" color="#ffffff" />
            <Text className="mt-4 text-center text-lg font-bold text-white">
              Procesando código
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
