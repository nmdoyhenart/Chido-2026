import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Pressable, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { leerDni, validarFotoBase64, type DatosDni } from '../../../shared/registro-cliente';
import ChidoLoader from '../ui/ChidoLoader';
import ConfirmacionDni from './ConfirmacionDni';
import { colores } from '../../theme/colores';

export type FotoCapturada = { uri: string; base64: string };
type Props = {
  modo: 'foto' | 'dni';
  onFoto: (foto: FotoCapturada) => void;
  onDni: (datos: DatosDni) => void;
  onClose: () => void;
};

// Se monta únicamente mientras está abierto, para liberar la cámara al salir.
export default function CamaraRegistro({ modo, onFoto, onDni, onClose }: Props) {
  const camara = useRef<CameraView>(null);
  const activa = useRef(true);
  const ocupada = useRef(false);
  const [permiso, solicitarPermiso, consultarPermiso] = useCameraPermissions();
  const [frente, setFrente] = useState<CameraType>(modo === 'foto' ? 'front' : 'back');
  const [lista, setLista] = useState(false);
  const [espera, setEspera] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [primerPlano, setPrimerPlano] = useState(AppState.currentState === 'active');
  const [intento, setIntento] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState(false);
  const [dniLeido, setDniLeido] = useState<DatosDni | null>(null);

  useEffect(() => {
    activa.current = true;
    const suscripcion = AppState.addEventListener('change', (estado) => {
      setPrimerPlano(estado === 'active');
      setLista(false);
      if (estado !== 'active') setFlash(false);
      if (estado === 'active') void consultarPermiso().catch(() => mostrarError('No se pudo verificar el permiso necesario. Volvé a intentarlo.'));
    });
    return () => { activa.current = false; suscripcion.remove(); };
  }, [consultarPermiso]);

  function mostrarError(mensaje: string) {
    if (!activa.current) return;
    setError(mensaje);
    Vibration.vibrate(180);
  }

  async function pedirPermiso() {
    if (ocupada.current) return;
    ocupada.current = true;
    setEspera('Solicitando permiso para utilizar la cámara…');
    try {
      const resultado = await solicitarPermiso();
      if (!resultado.granted) mostrarError('Necesitamos permiso de cámara para sacar la foto o leer tu DNI.');
    } catch {
      mostrarError('No se pudo solicitar el permiso. Intentá nuevamente.');
    } finally {
      ocupada.current = false;
      if (activa.current) setEspera(null);
    }
  }

  async function tomarFoto() {
    if (ocupada.current || !lista || !camara.current) return;
    ocupada.current = true;
    setEspera('Preparando tu foto…');
    setError(null);
    try {
      const captura = await camara.current.takePictureAsync({ quality: 0.85 });
      if (!activa.current) return;
      if (!captura?.uri) throw new Error('captura');
      const contexto = ImageManipulator.manipulate(captura.uri);
      let imagen: Awaited<ReturnType<typeof contexto.renderAsync>> | undefined;
      try {
        if (captura.width > 960 || captura.height > 960) {
          contexto.resize(captura.width >= captura.height ? { width: 960 } : { height: 960 });
        }
        imagen = await contexto.renderAsync();
        const foto = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
        if (!activa.current) return;
        if (!foto.base64 || !validarFotoBase64(foto.base64)) {
          mostrarError('No se pudo procesar la foto. Volvé a sacarla.');
          return;
        }
        onFoto({ uri: foto.uri, base64: foto.base64 });
        onClose();
      } finally {
        imagen?.release();
        contexto.release();
      }
    } catch {
      mostrarError('No se pudo sacar la foto. Verificá la cámara e intentá nuevamente.');
    } finally {
      ocupada.current = false;
      if (activa.current) setEspera(null);
    }
  }

  function escanear(raw: string) {
    if (ocupada.current || error || !activa.current) return;
    ocupada.current = true;
    const datos = leerDni(raw);
    if (!datos) {
      mostrarError('No pudimos leer los datos de tu documento. Volvé a escanearlo o completá los campos manualmente.');
      return;
    }
    // La cámara se desmonta y la lectura queda bloqueada hasta que la persona
    // revise los datos. No sobrescribir el formulario antes de confirmar.
    setFlash(false);
    setDniLeido(datos);
  }

  function cerrar() { activa.current = false; onClose(); }

  function reiniciarCamara() {
    if (ocupada.current && !error) return;
    setError(null);
    ocupada.current = false;
    setLista(false);
    setIntento((anterior) => anterior + 1);
  }

  if (dniLeido) return (
    <Modal animationType="slide" onRequestClose={cerrar}>
      <SafeAreaView className="flex-1 bg-chido-fondo">
        <ConfirmacionDni
          datos={dniLeido}
          onConfirmar={() => {
            if (!activa.current) return;
            activa.current = false;
            onDni(dniLeido);
            onClose();
          }}
          onReintentar={() => {
            ocupada.current = false;
            reiniciarCamara();
            setDniLeido(null);
          }}
          onCancelar={cerrar}
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <Modal animationType="slide" onRequestClose={cerrar}>
      <SafeAreaView className="flex-1 bg-chido-fondo">
        <View className="flex-row items-center justify-between gap-3 px-5 py-4">
          <Text className="flex-1 text-chido-texto-sobre-oscuro text-2xl font-bold">{modo === 'dni' ? 'Escanear DNI' : 'Foto personal'}</Text>
          <Pressable onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar cámara" className="p-3">
            <Ionicons name="close" size={30} color={colores.textoSobreOscuro} />
          </Pressable>
        </View>
        <Text className="text-chido-texto-sobre-oscuro text-lg text-center px-5 pb-4">
          {modo === 'dni' ? 'Escanea el código de barras completo de tu DNI dentro del marco, en horizontal.' : 'Centra tu rostro en el marco y asegurate de tener una buena iluminación.'}
        </Text>
        <View className="flex-1 min-h-48 mx-4 rounded-2xl overflow-hidden bg-chido-cabecera">
          {!permiso ? <ChidoLoader mensaje="Consultando permiso de cámara…" /> : !permiso.granted ? (
            <View className="flex-1 justify-center p-5 gap-5">
              <Text className="text-chido-texto-sobre-oscuro text-lg text-center">Permití el acceso a la cámara para continuar.</Text>
              <Pressable
                disabled={espera !== null}
                onPress={permiso.canAskAgain ? pedirPermiso : () => {
                  void Linking.openSettings().catch(() => mostrarError('Abrí la configuración del dispositivo y habilitá el uso de la cámara.'));
                }}
                className="bg-chido-cabecera rounded-xl p-4" accessibilityRole="button"
              >
                <Text className="text-chido-texto-sobre-oscuro text-center text-lg font-bold">{permiso.canAskAgain ? 'Permitir cámara' : 'Abrir configuración'}</Text>
              </Pressable>
            </View>
          ) : primerPlano ? (
            <>
              <CameraView
                key={`${frente}-${intento}`}
                ref={camara}
                style={{ flex: 1 }}
                facing={frente}
                mode="picture"
                // "off" mantiene el enfoque automático continuo;
                // "on" enfoca una vez y bloquea el enfoque.
                autofocus="off"
                zoom={modo === 'dni' ? zoom : 0}
                enableTorch={modo === 'dni' && flash && lista && !error}
                onCameraReady={() => setLista(true)}
                onMountError={() => { setLista(false); mostrarError('No pudimos iniciar la cámara. Intentalo nuevamente.'); }}
                barcodeScannerSettings={modo === 'dni' ? { barcodeTypes: ['pdf417', 'qr'] } : undefined}
                onBarcodeScanned={modo === 'dni' && !error && !espera ? ({ data }) => escanear(data) : undefined}
              />
              {modo === 'dni' && lista && !error && !espera && (
                <View pointerEvents="none" className="absolute inset-0" accessible accessibilityLabel="Guía de lectura: ubicá el código de barras dentro del rectángulo">
                  <View style={{ flex: 1, backgroundColor: 'rgba(67,20,7,0.55)', justifyContent: 'flex-end', paddingBottom: 12 }}>
                    <Text className="text-chido-texto-sobre-oscuro text-base font-bold text-center">Código de barras del DNI</Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(67,20,7,0.55)' }} />
                    <View style={{ width: '86%', aspectRatio: 3.2, borderWidth: 3, borderColor: '#FDE047', borderRadius: 8 }} />
                    <View style={{ flex: 1, backgroundColor: 'rgba(67,20,7,0.55)' }} />
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(67,20,7,0.55)', paddingTop: 12 }}>
                    <Text className="text-chido-texto-sobre-oscuro text-base font-bold text-center">Mantené tu documento quieto.</Text>
                  </View>
                </View>
              )}
              {!lista && !error && <View className="absolute inset-0 bg-chido-cabecera justify-center"><ChidoLoader mensaje="Iniciando cámara…" /></View>}
            </>
          ) : <ChidoLoader mensaje="Esperando volver a la aplicación…" />}
          {espera && <View className="absolute inset-0 bg-chido-cabecera justify-center"><ChidoLoader mensaje={espera} /></View>}
        </View>
        {error && (
          <View className="bg-chido-error rounded-xl mx-4 mt-4 p-4 gap-3" accessibilityLiveRegion="assertive">
            <Text className="text-chido-texto-sobre-oscuro text-base">{error}</Text>
            <Pressable onPress={reiniciarCamara} accessibilityRole="button">
              <Text className="text-chido-texto-sobre-oscuro font-bold text-lg underline">Reintentar</Text>
            </Pressable>
          </View>
        )}
        {modo === 'dni' && permiso?.granted && primerPlano && !error && (
          <View className="px-5 pt-3 gap-3">
            <Text className="text-chido-texto-sobre-oscuro text-base text-center">Si se ve borroso, alejá un poco el DNI y usá +. Evitá los reflejos sobre el documento.</Text>
            <View className="flex-row items-center justify-between gap-3">
              <Pressable disabled={!lista || zoom <= 0} onPress={() => setZoom(actual => Math.max(0, Math.round((actual - 0.05) * 100) / 100))} accessibilityRole="button" accessibilityLabel="Reducir acercamiento" style={{ opacity: !lista || zoom <= 0 ? 0.45 : 1 }} className="bg-chido-cabecera rounded-xl p-3">
                <Ionicons name="remove" size={26} color={colores.textoSobreOscuro} />
              </Pressable>
              <Text className="text-chido-texto-sobre-oscuro text-base text-center flex-1">Acercamiento {Math.round(zoom / 0.05)} de 4</Text>
              <Pressable disabled={!lista || zoom >= 0.2} onPress={() => setZoom(actual => Math.min(0.2, Math.round((actual + 0.05) * 100) / 100))} accessibilityRole="button" accessibilityLabel="Aumentar acercamiento" style={{ opacity: !lista || zoom >= 0.2 ? 0.45 : 1 }} className="bg-chido-cabecera rounded-xl p-3">
                <Ionicons name="add" size={26} color={colores.textoSobreOscuro} />
              </Pressable>
            </View>
            <View className="flex-row gap-3">
              <Pressable disabled={!lista} onPress={() => setFlash(actual => !actual)} accessibilityRole="button" accessibilityState={{ disabled: !lista, selected: flash }} className="flex-1 bg-chido-cabecera rounded-xl p-3">
                <Text className="text-chido-texto-sobre-oscuro text-base font-bold text-center">{flash ? 'Apagar flash' : 'Encender flash'}</Text>
              </Pressable>
              <Pressable disabled={!lista} onPress={reiniciarCamara} accessibilityRole="button" className="flex-1 bg-chido-cabecera rounded-xl p-3">
                <Text className="text-chido-texto-sobre-oscuro text-base font-bold text-center">Reiniciar cámara</Text>
              </Pressable>
            </View>
          </View>
        )}
        <View className="flex-row gap-3 p-5">
          {modo === 'foto' && permiso?.granted ? (
            <>
              <Pressable disabled={!lista || espera !== null} onPress={() => { setLista(false); setFrente((actual) => actual === 'front' ? 'back' : 'front'); }} accessibilityRole="button" accessibilityLabel="Cambiar cámara" className="bg-chido-cabecera rounded-xl p-4 justify-center">
                <Ionicons name="camera-reverse-outline" size={28} color={colores.textoSobreOscuro} />
              </Pressable>
              <Pressable disabled={!lista || espera !== null || !!error} onPress={tomarFoto} accessibilityRole="button" className={`flex-1 bg-chido-cabecera rounded-xl p-4 ${!lista || espera || error ? 'opacity-50' : ''}`}>
                <Text className="text-chido-texto-sobre-oscuro font-bold text-xl text-center">Tomar foto</Text>
              </Pressable>
            </>
          ) : <Pressable onPress={cerrar} accessibilityRole="button" className="flex-1 bg-chido-cabecera rounded-xl p-4"><Text className="text-chido-texto-sobre-oscuro text-lg text-center font-bold">Volver al formulario</Text></Pressable>}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
