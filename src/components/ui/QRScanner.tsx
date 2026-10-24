import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PropositoScannerQr } from "../../types/qr";
import { colores } from "../../theme/colores";

type QRScannerProps = {
  visible: boolean;
  proposito: Exclude<PropositoScannerQr, "dni">;
  onScan: (raw: string) => Promise<void> | void;
  onClose: () => void;
};

const instrucciones: Record<Exclude<PropositoScannerQr, "dni">, string> = {
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
      <View className="flex-1 bg-chido-fondo px-5 pb-8 pt-14">
        <Text className="text-center text-3xl font-bold text-chido-texto-sobre-oscuro">
          Escanear código
        </Text>
        <Text className="mb-6 mt-2 text-center text-base text-chido-texto-sobre-oscuro">
          {instrucciones[proposito]}
        </Text>

        {!permission || !permission.granted ? (
          <View className="flex-1 justify-center rounded-3xl bg-chido-acento p-6">
            <Text className="mb-6 text-center text-lg font-semibold text-chido-texto-sobre-oscuro">
              Se necesita permiso para acceder a la cámara.
            </Text>
            <Pressable
              className="rounded-2xl bg-chido-fondo p-4"
              onPress={requestCameraPermission}
            >
              <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">
                Dar permiso de cámara
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-1 overflow-hidden rounded-3xl border-4 border-chido-texto-secundario-alternativo">
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={processing ? undefined : ({ data }) => handleScan(data)}
            />
          </View>
        )}

        {error ? (
          <View className="mt-5 rounded-2xl bg-chido-error p-4">
            <Text className="text-center font-semibold text-chido-texto-sobre-oscuro">{error}</Text>
          </View>
        ) : null}

        <View className="mt-5 gap-3">
          {error ? (
            <Pressable className="rounded-2xl bg-chido-fondo p-4" onPress={reset}>
              <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">
                Escanear nuevamente
              </Text>
            </Pressable>
          ) : null}
          <Pressable className="rounded-2xl bg-chido-acento p-4" onPress={close}>
            <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Cancelar</Text>
          </Pressable>
        </View>

        {processing ? (
          <View className="absolute inset-0 items-center justify-center bg-chido-acento/95 px-8">
            <Image
              source={require("../../../assets/images/icon.png")}
              className="mb-5 h-24 w-24 rounded-3xl"
            />
            <ActivityIndicator size="large" color={colores.textoSobreOscuro} />
            <Text className="mt-4 text-center text-lg font-bold text-chido-texto-sobre-oscuro">
              Procesando código
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
