import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Header } from "../../components/Header";
import { QRDisplay } from "../../components/ui/QRDisplay";
import { crearMesa } from "../../services/mesas";
import type { Mesa, TipoMesa } from "../../types/mesa";
import { TIPOS_MESA } from "../../types/mesa";
import { createMesaQr } from "../../utils/qr";

type FotoTomada = {
  base64: string;
  uri: string;
};

export default function AgregarMesa() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [numero, setNumero] = useState("");
  const [cantidadComensales, setCantidadComensales] = useState("");
  const [tipo, setTipo] = useState<TipoMesa>("estándar");
  const [foto, setFoto] = useState<FotoTomada | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mesaQr, setMesaQr] = useState<Mesa | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function mostrarError(mensaje: string) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // La ausencia de hápticos no debe ocultar el aviso.
    }
    setAviso(mensaje);
  }

  const validarFormulario = (): boolean => {
    const numeroMesa = Number(numero);
    const capacidad = Number(cantidadComensales);

    if (!Number.isInteger(numeroMesa) || numeroMesa <= 0) {
      void mostrarError("Ingresá un número de mesa entero mayor a cero.");
      return false;
    }
    if (!Number.isInteger(capacidad) || capacidad <= 0) {
      void mostrarError("Ingresá una cantidad de comensales mayor a cero.");
      return false;
    }
    if (!foto) {
      void mostrarError("Tomá una foto de la mesa antes de guardarla.");
      return false;
    }
    return true;
  };

  const abrirCamara = async () => {
    if (!permission?.granted) {
      const respuesta = await requestPermission();
      if (!respuesta.granted) {
        await mostrarError("Se requiere permiso para usar la cámara.");
        return;
      }
    }
    setCameraVisible(true);
  };

  const tomarFoto = async () => {
    const resultado = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.45 });
    if (!resultado?.base64) {
      await mostrarError("No se pudo tomar la foto. Intentá nuevamente.");
      return;
    }

    setFoto({ base64: resultado.base64, uri: resultado.uri });
    setCameraVisible(false);
  };

  const guardarMesa = async () => {
    if (!validarFormulario() || !foto) return;

    setGuardando(true);
    try {
      const nuevaMesa = await crearMesa({
        numero: Number(numero),
        cantidadComensales: Number(cantidadComensales),
        tipo,
        fotoBase64: foto.base64,
      });
      setNumero("");
      setCantidadComensales("");
      setTipo("estándar");
      setFoto(null);
      setMesaQr(nuevaMesa);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      await mostrarError(error instanceof Error ? error.message : "No se pudo guardar la mesa.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View className="flex-1 bg-[#d77335]">
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName="Laura Gauto Morales" role="Supervisor" />

      <View className="flex-1 justify-between p-5 pb-6">
        <View className="flex-row items-center justify-between">
          <Pressable className="h-14 w-14 items-center justify-center rounded-2xl bg-[#b7602d]" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={30} color="#fff3de" />
          </Pressable>
          <Text className="font-serif text-3xl font-bold text-[#fff3de]">Alta de mesa</Text>
          <View className="w-14" />
        </View>

        <Pressable className="items-center" onPress={abrirCamara}>
          <View className="h-32 w-32 overflow-hidden rounded-[26px] border-2 border-dashed border-[#edbb91] bg-[#b7602d]">
            {foto ? (
              <Image source={{ uri: foto.uri }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="restaurant-outline" size={46} color="#fff3de" />
              </View>
            )}
          </View>
          <View className="mt-3 flex-row items-center rounded-full border-2 border-[#e9a978] bg-[#b7602d] px-6 py-3">
            <Ionicons name="camera-outline" size={22} color="#fff3de" />
            <Text className="ml-2 text-lg font-bold text-[#fff3de]">Tomar foto con la cámara</Text>
          </View>
        </Pressable>

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="mb-2 text-lg font-bold text-[#fff3de]">Número de mesa</Text>
            <TextInput value={numero} onChangeText={setNumero} keyboardType="number-pad" placeholder="Ej. 12" placeholderTextColor="#f4c6a4" className="rounded-2xl border-2 border-[#e9a978] bg-[#99481f] px-4 py-3 text-xl font-semibold text-[#fff3de]" />
          </View>
          <View className="flex-1">
            <Text className="mb-2 text-lg font-bold text-[#fff3de]">Comensales</Text>
            <TextInput value={cantidadComensales} onChangeText={setCantidadComensales} keyboardType="number-pad" placeholder="Ej. 4" placeholderTextColor="#f4c6a4" className="rounded-2xl border-2 border-[#e9a978] bg-[#99481f] px-4 py-3 text-xl font-semibold text-[#fff3de]" />
          </View>
        </View>

        <View>
          <Text className="mb-3 text-lg font-bold text-[#fff3de]">Tipo de mesa</Text>
          <View className="flex-row gap-3">
          {TIPOS_MESA.map((opcion) => (
            <Pressable key={opcion} className={`h-20 flex-1 items-center justify-center rounded-2xl px-2 ${tipo === opcion ? "border-2 border-[#f8cb60] bg-[#933b24]" : "bg-[#b7602d]"}`} onPress={() => setTipo(opcion)}>
              <Text className="text-center text-base font-bold text-[#fff3de]">{opcion}</Text>
            </Pressable>
          ))}
          </View>
        </View>

        <View>
          <Text className="mb-3 text-lg font-bold text-[#fff3de]">Disponibilidad</Text>
          <View className="flex-row items-center rounded-2xl border-2 border-[#e9a978] bg-[#b7602d] px-5 py-3">
            <View className="h-4 w-4 rounded-full bg-[#8fe66b]" />
            <Text className="ml-3 text-xl font-bold text-[#fff3de]">Vacía</Text>
            <Text className="ml-auto text-base text-[#f4c6a4]">Predeterminada</Text>
          </View>
        </View>

        <Pressable className="rounded-2xl bg-[#843020] p-5" onPress={guardarMesa} disabled={guardando}>
          <Text className="text-center text-xl font-bold text-[#fff3de]">Guardar mesa</Text>
        </Pressable>
      </View>

      <Modal visible={cameraVisible} animationType="slide" onRequestClose={() => setCameraVisible(false)}>
        <View className="flex-1 bg-[#d77335] p-5 pt-14">
          <Text className="mb-4 text-center text-2xl font-bold text-[#fff3de]">Foto de la mesa</Text>
          <View className="flex-1 overflow-hidden rounded-3xl border-4 border-[#edbb91]"><CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" /></View>
          <View className="mt-5 flex-row gap-3">
            <Pressable className="flex-1 rounded-2xl bg-[#b7602d] p-4" onPress={() => setCameraVisible(false)}><Text className="text-center text-lg font-bold text-[#fff3de]">Cancelar</Text></Pressable>
            <Pressable className="flex-1 rounded-2xl bg-[#f8cb60] p-4" onPress={tomarFoto}><Text className="text-center text-lg font-bold text-[#843020]">Capturar</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={mesaQr !== null} animationType="slide" onRequestClose={() => setMesaQr(null)}>
        <View className="flex-1 items-center justify-center bg-[#d77335] p-5">
          {mesaQr ? <QRDisplay etiqueta={`QR de la mesa ${mesaQr.numero}`} payload={createMesaQr(mesaQr.id)} /> : null}
          <Pressable className="mt-5 w-full rounded-2xl bg-[#843020] p-4" onPress={() => router.replace("/mesas/gestion" as any)}><Text className="text-center text-lg font-bold text-[#fff3de]">Ir a gestión de mesas</Text></Pressable>
          <Pressable className="mt-3 w-full rounded-2xl bg-[#b7602d] p-4" onPress={() => setMesaQr(null)}><Text className="text-center text-lg font-bold text-[#fff3de]">Cerrar</Text></Pressable>
        </View>
      </Modal>

      <Modal visible={aviso !== null} transparent animationType="fade" onRequestClose={() => setAviso(null)}>
        <View className="flex-1 items-center justify-center bg-[#843020]/85 p-6"><View className="w-full rounded-3xl bg-[#f8cb60] p-6"><Text className="text-center text-xl font-bold text-[#843020]">Atención</Text><Text className="mt-3 text-center text-base text-[#843020]">{aviso}</Text><Pressable className="mt-5 rounded-2xl bg-[#d77335] p-4" onPress={() => setAviso(null)}><Text className="text-center text-lg font-bold text-[#fff3de]">Entendido</Text></Pressable></View></View>
      </Modal>

      {guardando ? <View className="absolute inset-0 items-center justify-center bg-[#843020]/95"><Image source={require("../../../assets/images/icon.png")} className="h-24 w-24 rounded-3xl" /><ActivityIndicator className="mt-5" size="large" color="#fff3de" /><Text className="mt-4 text-lg font-bold text-[#fff3de]">Guardando mesa</Text></View> : null}
    </View>
  );
}
