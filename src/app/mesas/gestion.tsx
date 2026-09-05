import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { useEffect, useEffectEvent, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from "react-native";
import { Header } from "../../components/Header";
import { MesaCard } from "../../components/negocio/mesas/MesaCard";
import { QRDisplay } from "../../components/ui/QRDisplay";
import { useMesas } from "../../hooks/useMesas";
import type { Mesa } from "../../types/mesa";
import { createMesaQr } from "../../utils/qr";

const MESAS_POR_PAGINA = 4;

export default function GestionMesas() {
  const { mesas, cargando, recargar, cambiarDisponibilidad: persistirDisponibilidad } = useMesas();
  const [pagina, setPagina] = useState(0);
  const [actualizando, setActualizando] = useState(false);
  const [mesaQr, setMesaQr] = useState<Mesa | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const totalPaginas = Math.max(1, Math.ceil(mesas.length / MESAS_POR_PAGINA));
  const mesasPagina = mesas.slice(pagina * MESAS_POR_PAGINA, (pagina + 1) * MESAS_POR_PAGINA);

  async function mostrarError(mensaje: string) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // La ausencia de hápticos no debe ocultar el aviso.
    }
    setAviso(mensaje);
  }

  const cargarMesas = useEffectEvent(async () => {
    try {
      await recargar();
    } catch (error) {
      await mostrarError(error instanceof Error ? error.message : "No se pudieron cargar las mesas.");
    }
  });

  useEffect(() => {
    const timeout = setTimeout(() => void cargarMesas(), 0);
    return () => clearTimeout(timeout);
  }, []);

  const cambiarDisponibilidad = async (mesa: Mesa) => {
    setActualizando(true);
    try {
      const disponibilidad = mesa.disponibilidad === "vacía" ? "ocupada" : "vacía";
      await persistirDisponibilidad(mesa.id, disponibilidad);
    } catch (error) {
      await mostrarError(error instanceof Error ? error.message : "No se pudo actualizar la disponibilidad.");
    } finally {
      setActualizando(false);
    }
  };

  return (
    <View className="flex-1 bg-[#d77335]">
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName="Laura Gauto Morales" role="Supervisor" />
      <View className="flex-row items-center px-5 pt-4">
        <Pressable className="h-14 w-14 items-center justify-center rounded-2xl bg-[#b7602d]" onPress={() => router.back()}><Ionicons name="arrow-back" size={30} color="#fff3de" /></Pressable>
        <View className="flex-1 items-center"><Text className="font-serif text-3xl font-bold text-[#fff3de]">Gestión de mesas</Text><Text className="mt-1 text-lg text-[#fff3de]">{mesas.length} mesas · {mesas.filter((mesa) => mesa.disponibilidad === "vacía").length} disponibles</Text></View>
        <View className="w-14" />
      </View>

      <View className="flex-1 gap-3 p-5 pb-6">
        {mesasPagina.map((mesa) => (
          <MesaCard
            key={mesa.id}
            mesa={mesa}
            actualizando={actualizando}
            onCambiarDisponibilidad={cambiarDisponibilidad}
            onVerQr={setMesaQr}
          />
        ))}
        {mesasPagina.length === 0 && !cargando ? <View className="flex-1 items-center justify-center"><Text className="text-center text-xl text-[#fff3de]">Todavía no hay mesas registradas.</Text></View> : null}
        <View className="flex-row items-center justify-between pt-1">
          <Pressable className="rounded-2xl bg-[#843020] px-5 py-3" onPress={() => setPagina((actual) => Math.max(0, actual - 1))} disabled={pagina === 0}><Text className="font-bold text-[#fff3de]">Anterior</Text></Pressable>
          <Text className="font-bold text-[#fff3de]">Página {pagina + 1} de {totalPaginas}</Text>
          <Pressable className="rounded-2xl bg-[#843020] px-5 py-3" onPress={() => setPagina((actual) => Math.min(totalPaginas - 1, actual + 1))} disabled={pagina >= totalPaginas - 1}><Text className="font-bold text-[#fff3de]">Siguiente</Text></Pressable>
        </View>
      </View>

      <Modal visible={mesaQr !== null} animationType="slide" onRequestClose={() => setMesaQr(null)}><View className="flex-1 items-center justify-center bg-[#d77335] p-5">{mesaQr ? <QRDisplay etiqueta={`QR de la mesa ${mesaQr.numero}`} payload={createMesaQr(mesaQr.id)} /> : null}<Pressable className="mt-5 w-full rounded-2xl bg-[#843020] p-4" onPress={() => setMesaQr(null)}><Text className="text-center text-lg font-bold text-[#fff3de]">Cerrar</Text></Pressable></View></Modal>
      <Modal visible={aviso !== null} transparent animationType="fade" onRequestClose={() => setAviso(null)}><View className="flex-1 items-center justify-center bg-[#843020]/85 p-6"><View className="w-full rounded-3xl bg-[#f8cb60] p-6"><Text className="text-center text-xl font-bold text-[#843020]">Atención</Text><Text className="mt-3 text-center text-base text-[#843020]">{aviso}</Text><Pressable className="mt-5 rounded-2xl bg-[#d77335] p-4" onPress={() => setAviso(null)}><Text className="text-center text-lg font-bold text-[#fff3de]">Entendido</Text></Pressable></View></View></Modal>
      {cargando || actualizando ? <View className="absolute inset-0 items-center justify-center bg-[#843020]/95"><Image source={require("../../../assets/images/icon.png")} className="h-24 w-24 rounded-3xl" /><ActivityIndicator className="mt-5" size="large" color="#fff3de" /><Text className="mt-4 text-lg font-bold text-[#fff3de]">{actualizando ? "Actualizando mesa" : "Cargando mesas"}</Text></View> : null}
    </View>
  );
}
