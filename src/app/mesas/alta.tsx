import { useRestriccionSimulacion } from '../../components/ui/RestriccionSimulacion';
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { QRDisplay } from "../../components/ui/QRDisplay";
import { CerrarSesionButton } from "../../components/auth/CerrarSesionButton";
import { Header } from "../../components/Header";
import { crearMesa } from "../../services/mesas";
import type { Mesa, TipoMesa } from "../../types/mesa";
import { TIPOS_MESA } from "../../types/mesa";
import { createMesaQr } from "../../utils/qr";
import { useAppSession } from "../../contexts/AppSessionContext";
import { puedeAdministrarMesas } from "../../utils/permisos";
import { colores } from "../../theme/colores";

type FotoTomada = {
  base64: string;
  uri: string;
};

export default function AgregarMesa() {
  const { bloquear, modal } = useRestriccionSimulacion();
  const { role, mode, usuario } = useAppSession();
  const perfilVisible = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  const nombreVisible = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ').trim() || perfilVisible;
  const permitido = (mode === 'authenticated' || mode === 'simulation') && puedeAdministrarMesas(role);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const operacionEnCurso = useRef(false);
  const activa = useRef(true);
  const tokenCamara = useRef(0);
  const [sesionCamara, setSesionCamara] = useState(0);
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [numero, setNumero] = useState("");
  const [cantidadComensales, setCantidadComensales] = useState("");
  const [tipo, setTipo] = useState<TipoMesa>("estándar");
  const [foto, setFoto] = useState<FotoTomada | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [espera, setEspera] = useState<string | null>(null);
  const [camaraLista, setCamaraLista] = useState(false);
  const [mesaQr, setMesaQr] = useState<Mesa | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Pantalla sin scroll: el alto se mide con el teclado cerrado para dimensionar la foto.
  // Con el teclado abierto se ocultan la foto y la disponibilidad para que los campos queden a la vista.
  const [altoVista, setAltoVista] = useState(0);
  const [tecladoVisible, setTecladoVisible] = useState(false);

  useEffect(() => {
    const mostrar = Keyboard.addListener("keyboardDidShow", () => setTecladoVisible(true));
    const ocultar = Keyboard.addListener("keyboardDidHide", () => setTecladoVisible(false));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  useEffect(() => {
    activa.current = true;
    return () => {
      activa.current = false;
      tokenCamara.current += 1;
    };
  }, []);

  function mostrarError(mensaje: string) {
    if (!activa.current) return;
    setAviso(mensaje);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
      // La ausencia de hápticos no debe ocultar el aviso.
    });
  }

  const validarFormulario = (): boolean => {
    const numeroMesa = Number(numero);
    const capacidad = Number(cantidadComensales);

    if (!/^\d+$/.test(numero.trim()) || !Number.isSafeInteger(numeroMesa) || numeroMesa <= 0) {
      mostrarError("Ingresá un número de mesa entero positivo dentro del rango seguro.");
      return false;
    }
    if (!/^\d+$/.test(cantidadComensales.trim()) || !Number.isSafeInteger(capacidad) || capacidad <= 0) {
      mostrarError("Ingresá una cantidad de comensales entera positiva dentro del rango seguro.");
      return false;
    }
    if (!TIPOS_MESA.includes(tipo)) {
      mostrarError("Seleccioná un tipo de mesa válido.");
      return false;
    }
    if (!foto?.base64.trim() || !foto.uri.trim()) {
      mostrarError("Tomá una foto de la mesa antes de guardarla.");
      return false;
    }
    return true;
  };

  const abrirCamara = async () => {
    if (!activa.current || operacionEnCurso.current) return;
    const token = ++tokenCamara.current;
    operacionEnCurso.current = true;
    setEspera("Solicitando permiso de cámara");
    try {
      if (!permission?.granted) {
        const respuesta = await requestPermission();
        if (!activa.current || token !== tokenCamara.current) return;
        if (!respuesta.granted) {
          mostrarError("Se requiere permiso para usar la cámara. Podés habilitarlo en la configuración del dispositivo.");
          return;
        }
      }
      setCamaraLista(false);
      setSesionCamara(token);
      setCameraVisible(true);
    } catch {
      if (token === tokenCamara.current) mostrarError("No se pudo acceder a la cámara. Intentá nuevamente.");
    } finally {
      if (activa.current && token === tokenCamara.current) {
        operacionEnCurso.current = false;
        setEspera(null);
      }
    }
  };

  const tomarFoto = async () => {
    if (!activa.current || operacionEnCurso.current || !camaraLista || !cameraVisible) return;
    const token = tokenCamara.current;
    operacionEnCurso.current = true;
    setEspera("Capturando foto");
    try {
      const resultado = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.45 });
      if (!activa.current || token !== tokenCamara.current) return;
      if (!resultado?.base64?.trim() || !resultado.uri?.trim()) {
        mostrarError("No se pudo tomar la foto. Intentá nuevamente.");
        return;
      }
      setFoto({ base64: resultado.base64, uri: resultado.uri });
      cerrarCamara();
    } catch {
      if (token === tokenCamara.current) mostrarError("No se pudo tomar la foto. Intentá nuevamente.");
    } finally {
      if (activa.current && token === tokenCamara.current) {
        operacionEnCurso.current = false;
        setEspera(null);
      }
    }
  };

  const guardarMesa = async () => {
    if (bloquear('guardar mesas') || !permitido || mode !== 'authenticated') return;
    if (!activa.current || operacionEnCurso.current || !validarFormulario() || !foto) return;

    operacionEnCurso.current = true;
    setEspera("Guardando mesa");
    try {
      const nuevaMesa = await crearMesa({
        numero: Number(numero),
        cantidadComensales: Number(cantidadComensales),
        tipo,
        fotoBase64: foto.base64,
      });
      if (!activa.current) return;
      setNumero("");
      setCantidadComensales("");
      setTipo("estándar");
      setFoto(null);
      setMesaQr(nuevaMesa);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
        // La mesa ya está guardada aunque el dispositivo no tenga hápticos.
      });
    } catch (error) {
      mostrarError(error instanceof Error ? error.message : "No se pudo guardar la mesa.");
    } finally {
      operacionEnCurso.current = false;
      if (activa.current) setEspera(null);
    }
  };

  const volver = () => {
    // Salir descarta la respuesta de interfaz, no la escritura remota.
    activa.current = false;
    tokenCamara.current += 1;
    setMesaQr(null);
    setAviso(null);
    router.dismissTo("/(app)/home");
  };

  const cerrarCamara = () => {
    // Una captura anterior no puede modificar una nueva sesión de cámara.
    tokenCamara.current += 1;
    operacionEnCurso.current = false;
    setCameraVisible(false);
    setCamaraLista(false);
    setEspera(null);
    setAviso(null);
  };

  const ocupada = espera !== null;
  const anchoUtil = Math.min(576, width - insets.left - insets.right) - 32;
  const camposEnFila = anchoUtil >= 300 && fontScale <= 1.3;
  const tiposEnFila = anchoUtil >= 280 && fontScale <= 1.3;
  // La foto toma el alto que dejan libre el resto de los elementos (título, campos, tipo, disponibilidad y guardar).
  const altoResto = 48 + 64 + 84 + (tiposEnFila ? 92 : 236) + 84 + 64 + 76;
  const altoFoto = altoVista > 0 ? Math.max(96, Math.min(220, altoVista - altoResto)) : 128;
  const salida = (
    <Pressable className="min-h-12 flex-row items-center self-start rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera/70 px-3 py-2" onPress={volver} accessibilityRole="button">
      <Ionicons name="arrow-back" size={20} color={colores.textoSobreOscuro} />
      <Text className="ml-2 shrink text-base font-bold text-chido-texto-sobre-oscuro">Volver al panel</Text>
    </Pressable>
  );
  const indicador = (
    <View className="items-center justify-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera/70 p-5" accessibilityRole="progressbar" accessibilityLabel={espera ?? "Preparando cámara"}>
      <Image source={require("../../../assets/images/logo.png")} className="h-24 w-24" resizeMode="contain" />
      <ActivityIndicator className="mt-4" size="large" color={colores.textoSobreOscuro} />
      <Text className="mt-4 text-center text-lg font-bold text-chido-texto-sobre-oscuro" accessibilityLiveRegion="polite">{espera ?? "Preparando cámara"}</Text>
      {espera === "Guardando mesa" ? <Text className="mt-3 text-center text-base text-chido-texto-secundario-sobre-oscuro">Podés volver a mesas y continuar. El guardado puede seguir aunque salgas. Actualizá y revisá la lista antes de reintentar.</Text> : null}
    </View>
  );
  const contenidoAviso = (
    <View className="w-full rounded-3xl border-2 border-chido-acento bg-chido-superficie p-5">
      <Text className="text-center text-2xl font-bold text-chido-texto-sobre-claro" accessibilityRole="header">Atención</Text>
      <Text className="mt-3 text-center text-lg text-chido-texto-secundario-sobre-claro" accessibilityRole="alert">{aviso}</Text>
      <Pressable className="mt-5 min-h-14 justify-center rounded-2xl bg-chido-acento p-4" accessibilityRole="button" onPress={() => {
        setAviso(null);
        if (cameraVisible && !camaraLista) cerrarCamara();
      }}>
        <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Entendido</Text>
      </Pressable>
    </View>
  );

  if (!permitido) {
    return (
      <ImageBackground source={require("../../../assets/images/fondo.jpeg")} resizeMode="cover" blurRadius={2} className="flex-1">
        <View className="absolute inset-0 bg-chido-cabecera/35" />
        <SafeAreaView className="flex-1"><View className="flex-1 items-center justify-center gap-5 px-5">
          <Text className="text-center text-2xl font-bold text-chido-texto-sobre-oscuro">Acceso restringido</Text>
          <Text className="text-center text-lg text-chido-texto-secundario-sobre-oscuro">El alta de mesas está disponible sólo para Dueño o Supervisor.</Text>
          <Pressable className="w-full rounded-2xl bg-chido-cabecera p-4" onPress={() => router.dismissTo("/(app)/home")}><Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Volver al inicio</Text></Pressable>
          <CerrarSesionButton className="w-full" />
        </View></SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <View className="flex-1 bg-chido-fondo">
      {modal}
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName={nombreVisible} role={perfilVisible} />
      <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          {/* Sin scroll: los elementos se reparten todo el alto disponible. */}
          <View
            className="flex-1 px-5 py-3"
            onLayout={({ nativeEvent }) => {
              const alto = Math.round(nativeEvent.layout.height) - 24;
              if (!Keyboard.isVisible()) setAltoVista((actual) => (actual === alto ? actual : alto));
            }}
            accessibilityElementsHidden={ocupada}
            importantForAccessibility={ocupada ? "no-hide-descendants" : "auto"}
          >
            <View className="w-full max-w-xl flex-1 self-center" style={{ justifyContent: tecladoVisible ? "flex-start" : "space-evenly", gap: tecladoVisible ? 12 : 0 }}>
              <View className="relative flex-row items-center">
                <Pressable className="absolute left-0 z-10 h-12 w-12 items-center justify-center rounded-xl bg-chido-acento" onPress={volver} accessibilityRole="button" accessibilityLabel="Volver al panel de Supervisor">
                  <Ionicons name="arrow-back" size={26} color={colores.textoSobreOscuro} />
                </Pressable>
                <Text className="flex-1 text-center text-3xl font-bold text-chido-texto-sobre-oscuro" accessibilityRole="header">Alta de mesa</Text>
              </View>

              {!tecladoVisible && (
                <Pressable className="items-center" onPress={abrirCamara} disabled={ocupada} accessibilityRole="button" accessibilityLabel={foto ? "Volver a tomar la foto de la mesa" : "Tomar foto de la mesa"} accessibilityState={{ disabled: ocupada }}>
                  <View style={{ width: altoFoto, height: altoFoto }} className="overflow-hidden rounded-3xl border-2 border-dashed border-chido-texto-secundario-alternativo bg-chido-acento">
                    {foto ? <Image source={{ uri: foto.uri }} className="h-full w-full" resizeMode="cover" /> : <View className="flex-1 items-center justify-center"><Ionicons name="grid-outline" size={Math.round(altoFoto * 0.35)} color={colores.textoSobreOscuro} /></View>}
                  </View>
                  <View className="mt-3 min-h-16 w-full flex-row items-center justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento px-5 py-3">
                    <Ionicons name="camera-outline" size={30} color={colores.textoSobreOscuro} />
                    <Text className="ml-3 text-xl font-bold text-chido-texto-sobre-oscuro">{foto ? "Volver a tomar la foto" : "Tomar foto con la cámara"}</Text>
                  </View>
                </Pressable>
              )}

              <View className={`gap-4 ${camposEnFila ? "flex-row" : "flex-col"}`}>
                <View className={camposEnFila ? "flex-1" : "w-full"}>
                  <Text className="mb-1 ml-1 text-lg font-bold text-chido-texto-sobre-oscuro">Número de mesa</Text>
                  <TextInput value={numero} onChangeText={setNumero} keyboardType="number-pad" placeholder="Ej. 12" placeholderTextColor={colores.textoSecundarioAlternativo} editable={!ocupada} accessibilityLabel="Número de mesa" className="min-h-14 rounded-xl border-2 border-chido-texto-boton-outline bg-chido-cabecera px-4 py-3 text-xl text-chido-texto-sobre-oscuro" />
                </View>
                <View className={camposEnFila ? "flex-1" : "w-full"}>
                  <Text className="mb-1 ml-1 text-lg font-bold text-chido-texto-sobre-oscuro">Comensales</Text>
                  <TextInput value={cantidadComensales} onChangeText={setCantidadComensales} keyboardType="number-pad" placeholder="Ej. 4" placeholderTextColor={colores.textoSecundarioAlternativo} editable={!ocupada} accessibilityLabel="Cantidad de comensales" className="min-h-14 rounded-xl border-2 border-chido-texto-boton-outline bg-chido-cabecera px-4 py-3 text-xl text-chido-texto-sobre-oscuro" />
                </View>
              </View>

              <View>
                <Text className="mb-2 ml-1 text-lg font-bold text-chido-texto-sobre-oscuro">Tipo de mesa</Text>
                <View className={`gap-2 ${tiposEnFila ? "flex-row" : "flex-col"}`} accessibilityRole="radiogroup">
                  {(["estándar", "VIP", "movilidad reducida"] as const).map((opcion) => (
                    <Pressable key={opcion} className={`min-h-16 justify-center rounded-xl border-2 px-2 py-3 ${tipo === opcion ? "border-chido-texto-secundario-alternativo bg-chido-cabecera" : "border-chido-texto-boton-outline bg-chido-acento"}`} style={tiposEnFila ? { flex: 1 } : undefined} onPress={() => setTipo(opcion)} disabled={ocupada} accessibilityRole="radio" accessibilityState={{ checked: tipo === opcion, disabled: ocupada }}>
                      <Text className={`text-center font-bold text-chido-texto-sobre-oscuro ${anchoUtil < 350 ? "text-base" : "text-lg"}`}>{opcion === "VIP" ? "Preferencial" : opcion === "estándar" ? "Estándar" : "Movilidad reducida"}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {!tecladoVisible && (
                <View>
                  <Text className="mb-2 ml-1 text-lg font-bold text-chido-texto-sobre-oscuro">Disponibilidad</Text>
                  <View className={`gap-2 rounded-xl border-2 border-chido-texto-boton-outline bg-chido-cabecera px-4 py-3 ${camposEnFila ? "flex-row flex-wrap items-center justify-between" : "flex-col"}`}>
                    <View className="flex-row items-center">
                      <View className="mr-3 h-4 w-4 rounded-full bg-chido-activo" />
                      <Text className="text-xl font-bold text-chido-texto-sobre-oscuro">Vacía</Text>
                    </View>
                    <Text className="text-base text-chido-texto-secundario-alternativo">(predeterminada)</Text>
                  </View>
                </View>
              )}

              <Pressable className={`min-h-16 items-center justify-center rounded-xl bg-chido-cabecera p-4 ${ocupada ? "opacity-60" : "opacity-100"}`} onPress={guardarMesa} disabled={ocupada} accessibilityRole="button" accessibilityState={{ disabled: ocupada, busy: ocupada }}>
                <Text className="text-xl font-bold text-chido-texto-sobre-oscuro">Guardar mesa</Text>
              </Pressable>
            </View>
          </View>
          {ocupada && !cameraVisible ? (
            <ImageBackground source={require("../../../assets/images/fondo.jpeg")} resizeMode="cover" blurRadius={2} style={StyleSheet.absoluteFill}>
              <View className="absolute inset-0 bg-chido-cabecera/35" />
              <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
                <View className="w-full max-w-xl self-center p-4">{indicador}</View>
              </ScrollView>
            </ImageBackground>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={cameraVisible} animationType="slide" onRequestClose={cerrarCamara}>
        <ImageBackground source={require("../../../assets/images/fondo.jpeg")} resizeMode="cover" blurRadius={2} className="flex-1">
          <View className="absolute inset-0 bg-chido-cabecera/35" />
          <SafeAreaView className="flex-1">
            <View className="w-full max-w-xl self-center px-4 py-2">
              <Pressable className="min-h-12 flex-row items-center self-start rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera/70 px-3 py-2" onPress={cerrarCamara} accessibilityRole="button" accessibilityLabel="Cancelar y volver al formulario">
                <Ionicons name="arrow-back" size={22} color={colores.textoSobreOscuro} />
                <Text className="ml-2 shrink text-base font-bold text-chido-texto-sobre-oscuro">Cancelar</Text>
              </Pressable>
              <Text className="mt-2 text-center text-2xl font-bold text-chido-texto-sobre-oscuro" accessibilityRole="header">Foto de la mesa</Text>
            </View>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
              <View className="w-full max-w-xl self-center gap-4 p-5">
                <View className="overflow-hidden rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera/55" style={{ height: Math.max(260, Math.min(420, height * 0.5)) }}>
                  {cameraVisible ? <CameraView key={sesionCamara} ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => {
                    if (activa.current && sesionCamara === tokenCamara.current) setCamaraLista(true);
                  }} onMountError={() => {
                    if (!activa.current || sesionCamara !== tokenCamara.current) return;
                    setCamaraLista(false);
                    mostrarError("No se pudo iniciar la cámara. Cerrala e intentá nuevamente.");
                  }} /> : null}
                  {ocupada || (!camaraLista && !aviso) ? <ScrollView className="absolute inset-0 bg-chido-cabecera" contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} nestedScrollEnabled>{indicador}</ScrollView> : null}
                </View>
                {aviso ? contenidoAviso : null}
                <Pressable className={`min-h-14 justify-center rounded-2xl bg-chido-cabecera p-4 ${ocupada || !camaraLista || aviso !== null ? "opacity-60" : "opacity-100"}`} onPress={tomarFoto} disabled={ocupada || !camaraLista || aviso !== null} accessibilityRole="button" accessibilityLabel="Capturar foto de la mesa" accessibilityState={{ disabled: ocupada || !camaraLista || aviso !== null, busy: ocupada }}>
                  <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Capturar foto</Text>
                </Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </Modal>

      <Modal visible={mesaQr !== null} animationType="slide" onRequestClose={volver}>
        <ImageBackground source={require("../../../assets/images/fondo.jpeg")} resizeMode="cover" blurRadius={2} className="flex-1">
          <View className="absolute inset-0 bg-chido-cabecera/35" />
          <SafeAreaView className="flex-1">
            <View className="w-full max-w-xl self-center px-4 py-2">
              {salida}
              <Text className="mt-2 text-center text-2xl font-bold text-chido-texto-sobre-oscuro" accessibilityRole="header">Mesa guardada</Text>
            </View>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
              <View className="w-full max-w-xl self-center gap-4 p-5">
                {mesaQr ? <QRDisplay etiqueta={`Código QR de la mesa ${mesaQr.numero}`} payload={createMesaQr(mesaQr.id)} size={Math.max(1, Math.min(220, width - insets.left - insets.right - 116))} className="items-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera/70 p-5" /> : null}
                <Pressable className="min-h-14 justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera/70 p-4" onPress={() => setMesaQr(null)} accessibilityRole="button"><Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">Crear otra mesa</Text></Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </Modal>

      <Modal visible={aviso !== null && !cameraVisible} animationType="fade" onRequestClose={() => setAviso(null)}>
        <ImageBackground source={require("../../../assets/images/fondo.jpeg")} resizeMode="cover" blurRadius={2} className="flex-1">
          <View className="absolute inset-0 bg-chido-cabecera/35" />
          <SafeAreaView className="flex-1">
            <View className="w-full max-w-xl self-center px-4 py-2">{salida}</View>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
              <View className="w-full max-w-xl self-center p-5">{contenidoAviso}</View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </Modal>

    </View>
  );
}
