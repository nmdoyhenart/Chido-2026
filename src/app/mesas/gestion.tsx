import { useRestriccionSimulacion } from '../../components/ui/RestriccionSimulacion';
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
import { colores } from "../../theme/colores";

export default function GestionMesas() {
  const { bloquear, modal } = useRestriccionSimulacion();
  const navigation = useNavigation();
  const { role, mode, usuario } = useAppSession();
  const perfilVisible = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  const nombreVisible = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ').trim() || perfilVisible;
  const permitido = (mode === 'authenticated' || mode === 'simulation') && puedeAdministrarMesas(role);
  const { width } = useWindowDimensions();
  const saliendo = useRef(false);
  const numeroConsulta = useRef(0);
  const modificando = useRef(false);
  const { mesas, cargando, recargar, liberar: persistirLiberacion } = useMesas();
  const [actualizando, setActualizando] = useState(false);
  const [mesaQr, setMesaQr] = useState<Mesa | null>(null);
  const [mesaParaLiberar, setMesaParaLiberar] = useState<Mesa | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [tituloAviso, setTituloAviso] = useState('Atención');
  const [tipoAviso, setTipoAviso] = useState<'error' | 'exito'>('error');
  const [errorCarga, setErrorCarga] = useState(false);

  function volverAlInicio() {
    saliendo.current = true;
    setMesaQr(null);
    setAviso(null);
    router.dismissTo("/(app)/home");
  }

  async function mostrarError(mensaje: string, titulo = 'Atención') {
    if (saliendo.current || !navigation.isFocused()) return;
    setAviso(mensaje);
    setTituloAviso(titulo);
    setTipoAviso('error');
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // La ausencia de hápticos no debe ocultar el aviso.
    }
  }

  async function mostrarExito(mensaje: string, titulo: string) {
    if (saliendo.current || !navigation.isFocused()) return;
    setAviso(mensaje);
    setTituloAviso(titulo);
    setTipoAviso('exito');
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  async function solicitarLiberacion(mesa: Mesa) {
    if (bloquear('liberar una mesa') || !permitido || mode !== 'authenticated') return;
    if (modificando.current || cargando) return;
    modificando.current = true;
    setActualizando(true);
    try {
      const resultado = await persistirLiberacion(mesa.id);
      if (!resultado.liberada) {
        setMesaParaLiberar(mesa);
        return;
      }
      await mostrarExito(`La Mesa ${mesa.numero} quedó disponible.`, 'Mesa liberada');
    } catch (error) {
      await mostrarError(
        error instanceof Error ? error.message : "No se pudo actualizar la disponibilidad.",
        `La Mesa ${mesa.numero} no se puede liberar`,
      );
    } finally {
      modificando.current = false;
      if (!saliendo.current) setActualizando(false);
    }
  }

  async function confirmarLiberacion() {
    const mesa = mesaParaLiberar;
    if (!mesa || bloquear('liberar una mesa') || !permitido || mode !== 'authenticated') return;
    if (modificando.current || cargando) return;
    modificando.current = true;
    setActualizando(true);
    try {
      const resultado = await persistirLiberacion(mesa.id, true);
      if (!resultado.liberada) throw new Error("No se pudo confirmar la liberación de la mesa.");
      setMesaParaLiberar(null);
      await mostrarExito(`La Mesa ${mesa.numero} quedó disponible.`, 'Mesa liberada');
    } catch (error) {
      setMesaParaLiberar(null);
      await mostrarError(
        error instanceof Error ? error.message : "No se pudo actualizar la disponibilidad.",
        `La Mesa ${mesa.numero} no se puede liberar`,
      );
    } finally {
      modificando.current = false;
      if (!saliendo.current) setActualizando(false);
    }
  }

  if (!permitido) {
    return (
      <ImageBackground source={require("../../../assets/images/fondo.jpeg")} resizeMode="cover" blurRadius={2} className="flex-1">
        <View className="absolute inset-0 bg-chido-cabecera/35" />
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center gap-5 px-5">
            <Image source={require("../../../assets/images/logo.png")} style={{ width: 120, height: 120 }} resizeMode="contain" />
            <Text className="text-center text-2xl font-bold text-chido-texto-sobre-oscuro">Acceso restringido</Text>
            <Text className="text-center text-lg text-chido-texto-secundario-sobre-oscuro">La gestión de mesas está disponible sólo para Dueño o Supervisor.</Text>
            <Pressable className="w-full rounded-2xl bg-chido-cabecera p-4" accessibilityRole="button" onPress={() => router.dismissTo("/(app)/home")}><Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Volver al inicio</Text></Pressable>
            <CerrarSesionButton className="w-full" />
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <View className="flex-1 bg-chido-fondo">
      {modal}
      <Stack.Screen options={{ headerShown: false, title: "Mesas" }} />
      <Header userName={nombreVisible} role={perfilVisible} />
      <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1">
        <View className="w-full max-w-2xl flex-1 self-center">
          <View className="gap-3 px-5 pt-5 pb-2">
            <View className="relative flex-row items-center">
              <Pressable className="absolute left-0 z-10 h-10 w-10 items-center justify-center rounded-xl bg-chido-acento" accessibilityRole="button" accessibilityLabel="Volver al panel de Supervisor" onPress={volverAlInicio}>
                <Ionicons name="arrow-back" size={20} color={colores.textoSobreOscuro} />
              </Pressable>
              <Text accessibilityRole="header" className="flex-1 text-center text-2xl font-bold text-chido-texto-sobre-oscuro">Gestión de mesas</Text>
              <Pressable className="absolute right-0 z-10 h-10 w-10 items-center justify-center rounded-xl bg-chido-acento" accessibilityRole="button" accessibilityLabel="Actualizar listado de mesas" disabled={cargando || actualizando} onPress={() => void cargarMesas()}>
                <Ionicons name="refresh-outline" size={20} color={colores.textoSobreOscuro} />
              </Pressable>
            </View>
            <Text className="text-center text-base text-chido-texto-sobre-oscuro">{mesas.length} mesas · {mesas.filter((mesa) => mesa.disponibilidad === "vacía").length} disponibles</Text>
            <Pressable className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-chido-acento px-3 py-3" accessibilityRole="button" disabled={actualizando} onPress={() => router.push("/mesas/alta")}>
              <Ionicons name="add-circle-outline" size={24} color={colores.textoSobreOscuro} />
              <Text className="shrink text-center text-lg font-bold text-chido-texto-sobre-oscuro">Agregar mesa</Text>
            </Pressable>
          </View>

          <View className="flex-1">
            <View className="flex-1" accessibilityElementsHidden={cargando || actualizando} importantForAccessibility={cargando || actualizando ? "no-hide-descendants" : "auto"}>
            {mesas.length > 0 ? (
              <ListadoMesas mesas={mesas} onLiberar={solicitarLiberacion} onVerQr={mesa => { if (!bloquear('generar un QR de mesa')) setMesaQr(mesa); }} />
            ) : !cargando ? (
              <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
                <View className="m-5 rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento p-5">
                  <Text className="text-center text-xl font-bold text-chido-texto-sobre-oscuro">{errorCarga ? "No se pudo consultar el listado." : "Todavía no hay mesas registradas."}</Text>
                  <Text className="mt-2 text-center text-base text-chido-texto-secundario-sobre-oscuro">{errorCarga ? "Revisá la conexión y volvé a intentarlo." : "Agregá la primera mesa para ver sus datos y su código QR."}</Text>
                  {errorCarga ? <Pressable accessibilityRole="button" className="mt-4 rounded-xl bg-chido-cabecera p-4" onPress={() => void cargarMesas()}><Text className="text-center font-bold text-chido-texto-sobre-oscuro">Reintentar</Text></Pressable> : null}
                </View>
              </ScrollView>
            ) : null}
            </View>
            {cargando || actualizando ? (
              <ImageBackground source={require("../../../assets/images/fondo.jpeg")} resizeMode="cover" blurRadius={2} style={StyleSheet.absoluteFill}>
                <View className="absolute inset-0 bg-chido-cabecera/35" />
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
                <View accessibilityRole="progressbar" className="items-center p-5">
                  <Image source={require("../../../assets/images/logo.png")} style={{ width: 96, height: 96 }} resizeMode="contain" />
                  <ActivityIndicator className="mt-3" size="large" color={colores.textoSecundarioAlternativo} />
                  <Text className="mt-3 text-center text-lg font-bold text-chido-texto-sobre-oscuro">{actualizando ? "Actualizando mesa" : "Cargando mesas"}</Text>
                  <Text className="mt-2 text-center text-base text-chido-texto-secundario-sobre-oscuro">{actualizando ? "Podés volver al inicio. La actualización puede continuar; revisá el listado antes de volver a modificar la mesa." : "Podés volver al inicio mientras se consulta el listado."}</Text>
                </View>
                </ScrollView>
              </ImageBackground>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <Modal visible={mesaParaLiberar !== null} transparent animationType="fade" onRequestClose={() => setMesaParaLiberar(null)}>
        <View className="flex-1 items-center justify-center bg-black/60 px-5">
          <View className="w-full max-w-lg rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera p-5">
            <Ionicons name="exit-outline" size={38} color={colores.textoSobreOscuro} style={{ alignSelf: "center" }} />
            <Text className="mt-3 text-center text-2xl font-bold text-chido-texto-sobre-oscuro">Liberar mesa {mesaParaLiberar?.numero}</Text>
            <Text className="mt-3 text-center text-base text-chido-texto-secundario-sobre-oscuro">
              Hay una cuenta solicitada que todavía no figura como pagada. Si continuás, la mesa quedará disponible y la cuenta pendiente permanecerá registrada. ¿Estás seguro?
            </Text>
            <View className="mt-5 flex-row gap-3">
              <Pressable accessibilityRole="button" disabled={actualizando} onPress={() => setMesaParaLiberar(null)} className="min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento px-3 py-3">
                <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Cancelar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={actualizando} onPress={() => void confirmarLiberacion()} className="min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-botonPrincipal px-3 py-3">
                {actualizando ? <ActivityIndicator color={colores.textoSobreOscuro} /> : <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Sí, liberar igualmente</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={mesaQr !== null} animationType="slide" onRequestClose={() => setMesaQr(null)}>
        <ImageBackground source={require("../../../assets/images/fondo.jpeg")} resizeMode="cover" blurRadius={2} className="flex-1">
          <View className="absolute inset-0 bg-chido-cabecera/35" />
          <SafeAreaView className="flex-1">
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
              <View className="w-full max-w-lg self-center items-center gap-5 p-5">
                <Image source={require("../../../assets/images/logo.png")} style={{ width: 96, height: 96, transform: [{ translateY: -20 }] }} resizeMode="contain" />
                {mesaQr ? <QRDisplay etiqueta={`Código QR de la mesa ${mesaQr.numero}`} payload={createMesaQr(mesaQr.id)} size={Math.min(240, Math.max(100, width - 120))} className="items-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera/70 p-5" /> : null}
                <Text className="text-center text-base text-chido-texto-secundario-sobre-oscuro">Este código identifica la mesa. La asignación del cliente se verifica por separado.</Text>
                <Pressable accessibilityRole="button" className="mt-5 min-h-12 w-full justify-center rounded-xl bg-chido-cabecera p-3" onPress={() => setMesaQr(null)}><Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Volver a mesas</Text></Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </Modal>

      <Modal visible={aviso !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setAviso(null)}>
        <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: "rgba(43, 22, 14, 0.68)" }}>
          <View accessibilityViewIsModal className="w-full max-w-lg rounded-3xl border-2 bg-chido-cabecera p-6" style={{ borderColor: colores.bordeNaranja }}>
            <View className="mb-3 h-16 w-16 self-center items-center justify-center rounded-full" style={{ backgroundColor: colores.superficieTerracota }}>
              <Ionicons name={tipoAviso === 'exito' ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={42} color={tipoAviso === 'exito' ? colores.activo : colores.bordeError} />
            </View>
            <Text accessibilityRole="header" className="text-center text-2xl font-bold text-chido-texto-sobre-oscuro">
              {tituloAviso}
            </Text>
            <Text accessibilityLiveRegion="assertive" className="mt-3 text-center text-base leading-6 text-chido-texto-secundario-sobre-oscuro">
              {aviso}
            </Text>
            <Pressable accessibilityRole="button" className="mt-6 min-h-14 items-center justify-center rounded-2xl border px-4 py-3 bg-chido-botonPrincipal" style={{ borderColor: colores.textoSecundarioSobreOscuro }} onPress={() => setAviso(null)}>
              <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Entendido</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
