import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack, useNavigation } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ActivityIndicator, Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListadoMesas } from "../../components/negocio/mesas/ListadoMesas";
import { CerrarSesionButton } from "../../components/auth/CerrarSesionButton";
import { Header } from "../../components/Header";
import { QRDisplay } from "../../components/ui/QRDisplay";
import { useMesas } from "../../hooks/useMesas";
import type { Mesa } from "../../types/mesa";
import { createMesaQr } from "../../utils/qr";
import { useAppSession } from "../../contexts/AppSessionContext";
import { puedeAdministrarMesas } from "../../utils/permisos";

export default function GestionMesas() {
  const navigation = useNavigation();
  const { role } = useAppSession();
  const permitido = puedeAdministrarMesas(role);
  const { width } = useWindowDimensions();
  const saliendo = useRef(false);
  const numeroConsulta = useRef(0);
  const modificando = useRef(false);
  const { mesas, cargando, recargar, cambiarDisponibilidad: persistirDisponibilidad } = useMesas();
  const [actualizando, setActualizando] = useState(false);
  const [mesaQr, setMesaQr] = useState<Mesa | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);

  function volverAlInicio() {
    saliendo.current = true;
    setMesaQr(null);
    setAviso(null);
    router.dismissTo("/(app)/home");
  }

  async function mostrarError(mensaje: string) {
    if (saliendo.current || !navigation.isFocused()) return;
    setAviso(mensaje);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // La ausencia de hápticos no debe ocultar el aviso.
    }
  }

  async function cargarMesas(forzar = false) {
    const numero = ++numeroConsulta.current;
    setErrorCarga(false);
    try {
      await recargar(forzar);
    } catch (error) {
      if (numero !== numeroConsulta.current) return;
      if (!saliendo.current && navigation.isFocused()) setErrorCarga(true);
      await mostrarError(error instanceof Error ? error.message : "No se pudieron cargar las mesas.");
    }
  }

  const cargarAlEnfocar = useEffectEvent(() => {
    saliendo.current = false;
    void cargarMesas(true);
  });

  useEffect(() => {
    let timeout = setTimeout(() => {
      if (permitido && navigation.isFocused()) cargarAlEnfocar();
    }, 0);
    const cancelarSuscripcion = navigation.addListener("focus", () => {
      clearTimeout(timeout);
      if (permitido) timeout = setTimeout(() => cargarAlEnfocar(), 0);
    });
    return () => {
      saliendo.current = true;
      clearTimeout(timeout);
      cancelarSuscripcion();
    };
  }, [navigation, permitido]);

  async function cambiarDisponibilidad(mesa: Mesa) {
    if (modificando.current || cargando) return;
    modificando.current = true;
    setActualizando(true);
    try {
      await persistirDisponibilidad(mesa.id, mesa.disponibilidad === "vacía" ? "ocupada" : "vacía");
    } catch (error) {
      await mostrarError(error instanceof Error ? error.message : "No se pudo actualizar la disponibilidad.");
    } finally {
      modificando.current = false;
      if (!saliendo.current) setActualizando(false);
    }
  }

  if (!permitido) {
    return (
      <ImageBackground source={require("../../../assets/images/fondo.jpeg")} resizeMode="cover" blurRadius={2} className="flex-1">
        <View className="absolute inset-0 bg-orange-800/35" />
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center gap-5 px-5">
            <Image source={require("../../../assets/images/logo.png")} style={{ width: 120, height: 120 }} resizeMode="contain" />
            <Text className="text-center text-2xl font-bold text-yellow-50">Acceso restringido</Text>
            <Text className="text-center text-lg text-yellow-100">La gestión de mesas está disponible sólo para Dueño o Supervisor.</Text>
            <Pressable className="w-full rounded-2xl bg-red-900 p-4" accessibilityRole="button" onPress={() => router.dismissTo("/(app)/home")}><Text className="text-center text-lg font-bold text-white">Volver al inicio</Text></Pressable>
            <CerrarSesionButton className="w-full" />
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <View className="flex-1 bg-[#d97736]">
      <Stack.Screen options={{ headerShown: false, title: "Mesas" }} />
      <Header userName="Administración" role="Mesas" />
      <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1">
        <View className="w-full max-w-2xl flex-1 self-center">
          <View className="gap-3 px-5 pt-5 pb-2">
            <View className="relative flex-row items-center">
              <Pressable className="absolute left-0 z-10 h-10 w-10 items-center justify-center rounded-xl bg-[#b35e25]" accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={volverAlInicio}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </Pressable>
              <Text accessibilityRole="header" className="flex-1 text-center text-2xl font-bold text-white">Gestión de mesas</Text>
              <Pressable className="absolute right-0 z-10 h-10 w-10 items-center justify-center rounded-xl bg-[#b35e25]" accessibilityRole="button" accessibilityLabel="Actualizar listado de mesas" disabled={cargando || actualizando} onPress={() => void cargarMesas()}>
                <Ionicons name="refresh-outline" size={20} color="#fff" />
              </Pressable>
            </View>
            <Text className="text-center text-base text-white">{mesas.length} mesas · {mesas.filter((mesa) => mesa.disponibilidad === "vacía").length} disponibles</Text>
            <Pressable className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-[#b35e25] px-3 py-3" accessibilityRole="button" disabled={actualizando} onPress={() => router.push("/mesas/alta")}>
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
              <Text className="shrink text-center text-lg font-bold text-white">Agregar mesa</Text>
            </Pressable>
          </View>

          <View className="flex-1">
            <View className="flex-1" accessibilityElementsHidden={cargando || actualizando} importantForAccessibility={cargando || actualizando ? "no-hide-descendants" : "auto"}>
            {mesas.length > 0 ? (
              <ListadoMesas mesas={mesas} onCambiarDisponibilidad={cambiarDisponibilidad} onVerQr={setMesaQr} />
            ) : !cargando ? (
              <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
                <View className="m-5 rounded-3xl border-2 border-[#e6b18c] bg-[#b35e25] p-5">
                  <Text className="text-center text-xl font-bold text-[#fff4ea]">{errorCarga ? "No se pudo consultar el listado." : "Todavía no hay mesas registradas."}</Text>
                  <Text className="mt-2 text-center text-base text-[#f2c4a8]">{errorCarga ? "Revisá la conexión y volvé a intentarlo." : "Agregá la primera mesa para ver sus datos y su código QR."}</Text>
                  {errorCarga ? <Pressable accessibilityRole="button" className="mt-4 rounded-xl bg-[#9c5120] p-4" onPress={() => void cargarMesas()}><Text className="text-center font-bold text-white">Reintentar</Text></Pressable> : null}
                </View>
              </ScrollView>
            ) : null}
            </View>
            {cargando || actualizando ? (
              <ImageBackground source={require("../../../assets/images/fondo.jpeg")} resizeMode="cover" blurRadius={2} style={StyleSheet.absoluteFill}>
                <View className="absolute inset-0 bg-orange-800/35" />
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
                <View accessibilityRole="progressbar" className="items-center p-5">
                  <Image source={require("../../../assets/images/logo.png")} style={{ width: 96, height: 96 }} resizeMode="contain" />
                  <ActivityIndicator className="mt-3" size="large" color="#FFE4C7" />
                  <Text className="mt-3 text-center text-lg font-bold text-yellow-50">{actualizando ? "Actualizando mesa" : "Cargando mesas"}</Text>
                  <Text className="mt-2 text-center text-base text-yellow-100">{actualizando ? "Podés volver al inicio. La actualización puede continuar; revisá el listado antes de volver a modificar la mesa." : "Podés volver al inicio mientras se consulta el listado."}</Text>
                </View>
                </ScrollView>
              </ImageBackground>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <Modal visible={mesaQr !== null} animationType="slide" onRequestClose={() => setMesaQr(null)}>
        <View className="flex-1 bg-[#d97736]">
          <SafeAreaView className="flex-1">
            <Pressable accessibilityRole="button" className="mx-5 mt-2 min-h-12 justify-center rounded-xl bg-[#9c5120] p-3" onPress={() => setMesaQr(null)}><Text className="text-center text-lg font-bold text-white">Volver a mesas</Text></Pressable>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
              <View className="w-full max-w-lg self-center items-center gap-5 p-5">
                <Image source={require("../../../assets/images/logo.png")} style={{ width: 96, height: 96 }} resizeMode="contain" />
                {mesaQr ? <QRDisplay etiqueta={`Código QR de la mesa ${mesaQr.numero}`} payload={createMesaQr(mesaQr.id)} size={Math.min(240, Math.max(100, width - 120))} className="items-center rounded-3xl border-2 border-[#e6b18c] bg-[#b35e25] p-5" /> : null}
                <Text className="text-center text-base text-[#f2c4a8]">Este código identifica la mesa. La asignación del cliente se verifica por separado.</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={aviso !== null} animationType="fade" onRequestClose={() => setAviso(null)}>
        <View className="flex-1 bg-[#d97736]">
          <SafeAreaView className="flex-1">
            <Pressable accessibilityRole="button" className="mx-5 mt-2 rounded-xl bg-[#9c5120] p-3" onPress={volverAlInicio}><Text className="text-center text-lg font-bold text-white">Volver al inicio</Text></Pressable>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
              <View className="m-5 rounded-3xl border-2 border-[#e6b18c] bg-[#b35e25] p-5">
                <Text className="text-center text-xl font-bold text-[#fff4ea]">Atención</Text>
                <Text className="mt-3 text-center text-base text-[#f2c4a8]">{aviso}</Text>
                <Pressable accessibilityRole="button" className="mt-5 rounded-xl bg-[#9c5120] p-4" onPress={() => setAviso(null)}><Text className="text-center text-lg font-bold text-white">Entendido</Text></Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
