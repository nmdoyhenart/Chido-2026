import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Image, ImageBackground, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { validarConfirmacion, validarRegistroCliente, type CampoRegistro, type DatosRegistroCliente, type ErroresRegistro } from '../../../shared/registro-cliente';
import CampoFormulario from '../ui/CampoFormulario';
import ErrorFormulario from '../ui/ErrorFormulario';
import ChidoLoader from '../ui/ChidoLoader';
import CamaraRegistro, { type FotoCapturada } from './CamaraRegistro';
import { colores } from '../../theme/colores';
import { useCampoVisibleConTeclado } from '../../hooks/useCampoVisibleConTeclado';

export type ResultadoFormulario = { ok: true } | { ok: false; mensaje: string; campos?: ErroresRegistro };
type Props = {
  esMetre: boolean;
  onSubmit: (datos: DatosRegistroCliente) => Promise<ResultadoFormulario>;
  onVolver: () => void;
};

const INICIAL = { nombres: '', apellidos: '', dni: '', correo: '', password: '', confirmarPassword: '' };
type CampoTexto = keyof typeof INICIAL;

export default function FormularioRegistroCliente({ esMetre, onSubmit, onVolver }: Props) {
  const [valores, setValores] = useState(INICIAL);
  const [foto, setFoto] = useState<FotoCapturada | null>(null);
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [avisoDni, setAvisoDni] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [camara, setCamara] = useState<'foto' | 'dni' | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const pendiente = useRef(false);
  const activa = useRef(true);
  const scroll = useRef<ScrollView>(null);
  const inputs = useRef<Partial<Record<CampoTexto, TextInput | null>>>({});
  const posiciones = useRef<Partial<Record<CampoRegistro, number>>>({});
  const inicioFormulario = useRef(0);
  const { alDesplazar, alEnfocar, rellenoInferior } = useCampoVisibleConTeclado(scroll);

  useEffect(() => {
    activa.current = true;
    return () => { activa.current = false; };
  }, []);
  useFocusEffect(useCallback(() => () => setCamara(null), []));

  function editar(campo: CampoTexto, valor: string) {
    if (campo === 'dni' && /[^0-9]/.test(valor)) {
      setErrores((actual) => ({ ...actual, dni: 'El DNI sólo admite números, sin letras, símbolos ni espacios.' }));
      Vibration.vibrate(180);
      return;
    }
    const nuevos = { ...valores, [campo]: valor };
    setValores(nuevos);
    const validacion = validarRegistroCliente({ ...nuevos, fotoBase64: foto?.base64 ?? '' });
    setErrores((actual) => ({
      ...actual,
      [campo]: actual[campo] ? (campo === 'confirmarPassword' ? validarConfirmacion(nuevos.password, nuevos.confirmarPassword) : validacion.errores[campo]) : undefined,
      ...(campo === 'password' && nuevos.confirmarPassword ? { confirmarPassword: validarConfirmacion(nuevos.password, nuevos.confirmarPassword) } : {}),
    }));
    setMensaje(null);
  }

  function validarCampo(campo: CampoTexto) {
    const resultado = validarRegistroCliente({ ...valores, fotoBase64: foto?.base64 ?? '' });
    const error = campo === 'confirmarPassword' ? validarConfirmacion(valores.password, valores.confirmarPassword) : resultado.errores[campo];
    setErrores((actual) => ({ ...actual, [campo]: error }));
    if (error) Vibration.vibrate(180);
  }

  function mostrarErrores(nuevos: ErroresRegistro) {
    setErrores(nuevos);
    const primero = (['fotoBase64', 'nombres', 'apellidos', 'dni', 'correo', 'password', 'confirmarPassword'] as const).find((campo) => nuevos[campo]);
    if (primero) {
      scroll.current?.scrollTo({ y: Math.max(0, inicioFormulario.current + (posiciones.current[primero] ?? 0) - 16), animated: true });
      if (primero !== 'fotoBase64') inputs.current[primero]?.focus();
    }
    Vibration.vibrate(180);
  }

  function volver() {
    Keyboard.dismiss();
    onVolver();
  }

  async function registrar() {
    if (pendiente.current || finalizado) return;
    Keyboard.dismiss();
    const resultado = validarRegistroCliente({ ...valores, fotoBase64: foto?.base64 ?? '' });
    const confirmacion = validarConfirmacion(valores.password, valores.confirmarPassword);
    if (confirmacion) resultado.errores.confirmarPassword = confirmacion;
    if (Object.keys(resultado.errores).length) {
      mostrarErrores(resultado.errores);
      return;
    }
    pendiente.current = true;
    setEnviando(true);
    setMensaje(null);
    setErrores({});
    try {
      const respuesta = await onSubmit(resultado.datos);
      if (!activa.current) return;
      if (!respuesta.ok) {
        setMensaje(respuesta.mensaje);
        mostrarErrores(respuesta.campos ?? {});
        if (!respuesta.campos || !Object.keys(respuesta.campos).length) scroll.current?.scrollToEnd({ animated: true });
        return;
      }
      setValores(INICIAL);
      setFoto(null);
      setFinalizado(true);
    } catch {
      if (activa.current) {
        setMensaje('No pudimos confirmar el registro. Revisá la conexión antes de volver a intentarlo.');
        Vibration.vibrate(180);
        scroll.current?.scrollToEnd({ animated: true });
      }
    } finally {
      pendiente.current = false;
      if (activa.current) setEnviando(false);
    }
  }

  const campos: { id: CampoTexto; etiqueta: string; ayuda?: string; placeholder: string; limite: number }[] = [
    { id: 'nombres', etiqueta: 'Nombres', placeholder: 'Tu(s) nombre(s)', ayuda: 'Máximo 15 caracteres.', limite: 15 },
    { id: 'apellidos', etiqueta: 'Apellidos', placeholder: 'Tu(s) apellido(s)', ayuda: 'Máximo 15 caracteres.', limite: 15 },
    { id: 'dni', etiqueta: 'DNI', placeholder: 'Ej: 12345678', limite: 8 },
    { id: 'correo', etiqueta: 'Correo electrónico', placeholder: 'nombre@ejemplo.com', limite: 255 },
    { id: 'password', etiqueta: 'Contraseña', placeholder: 'Entre 8 y 30 caracteres', ayuda: 'Debe incluir al menos ocho caracteres y una letra mayúscula.', limite: 30 },
    { id: 'confirmarPassword', etiqueta: 'Confirmar contraseña', placeholder: 'Repetí exactamente la misma contraseña', limite: 30 },
  ];

  return (
    <ImageBackground source={require('../../../assets/images/fondo.jpeg')} className="flex-1" resizeMode="cover" blurRadius={3}>
      <SafeAreaView className="flex-1 bg-chido-fondo/95">
        {finalizado ? (
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
            <Image source={require('../../../assets/images/logo.png')} style={{ width: 180, height: 180, alignSelf: 'center' }} resizeMode="contain" />
            <Text className="text-chido-texto-sobre-oscuro text-3xl font-bold text-center mt-6" accessibilityLiveRegion="polite">Registro recibido</Text>
            <Text className="text-chido-texto-sobre-oscuro text-xl text-center my-6">
              {esMetre ? 'El cliente quedó pendiente de aprobación. Podrá ingresar cuando el dueño o supervisor acepte su registro.' : 'Tu registro quedó pendiente de aprobación. Podrás ingresar cuando el dueño o supervisor lo acepte.'}
            </Text>
            <Pressable onPress={volver} accessibilityRole="button" className="bg-chido-cabecera rounded-xl p-5"><Text className="text-chido-texto-sobre-oscuro text-xl text-center font-bold">{esMetre ? 'Volver al inicio' : 'Volver al ingreso'}</Text></Pressable>
          </ScrollView>
        ) : (
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onScroll={alDesplazar} scrollEventThrottle={16} contentContainerStyle={{ flexGrow: 1, paddingBottom: rellenoInferior }}>
              <View className="items-center px-6 pt-5 pb-4">
                <Image source={require('../../../assets/images/logo.png')} style={{ width: 125, height: 125 }} resizeMode="contain" />
                <Text className="text-chido-texto-sobre-oscuro text-3xl font-extrabold text-center mt-2">{esMetre ? 'Registrar cliente' : 'Crear cuenta'}</Text>
                <Text className="text-chido-texto-secundario-sobre-oscuro text-lg text-center mt-3">Completá todos los campos. El registro requiere aprobación del dueño o supervisor.</Text>
              </View>
              <View className="px-6 pb-6" onLayout={({ nativeEvent }) => { inicioFormulario.current = nativeEvent.layout.y; }}>
                <View onLayout={({ nativeEvent }) => { posiciones.current.fotoBase64 = nativeEvent.layout.y; }} className="mb-5">
                  <Text className="text-chido-texto-sobre-oscuro text-lg font-bold mb-3">Foto personal</Text>
                  <View style={errores.fotoBase64 ? { borderColor: colores.bordeError } : undefined} className="h-64 rounded-2xl bg-chido-cabecera border-2 border-chido-texto-boton-outline items-center justify-center overflow-hidden">
                    {foto ? <Image source={{ uri: foto.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel="Foto personal tomada con la cámara" /> : <View className="items-center px-5 gap-3"><Ionicons name="camera-outline" size={56} color={colores.textoSecundarioAlternativo} /><Text className="text-chido-texto-secundario-sobre-oscuro text-lg text-center">Tomá una foto donde se vea bien tu rostro.</Text></View>}
                  </View>
                  {errores.fotoBase64 && <View className="mt-2"><ErrorFormulario mensaje={errores.fotoBase64} /></View>}
                  <Pressable disabled={enviando} onPress={() => { Keyboard.dismiss(); setCamara('foto'); }} accessibilityRole="button" className="bg-chido-cabecera rounded-xl p-4 mt-3"><Text className="text-chido-texto-sobre-oscuro text-lg text-center font-bold">{foto ? 'Volver a tomar foto' : 'Tomar foto'}</Text></Pressable>
                </View>
                <Pressable disabled={enviando} onPress={() => { Keyboard.dismiss(); setCamara('dni'); }} accessibilityRole="button" className="border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera rounded-xl p-4 mb-3 flex-row justify-center items-center gap-3">
                  <Ionicons name="scan-outline" size={28} color={colores.textoSobreOscuro} /><Text className="text-chido-texto-sobre-oscuro text-lg font-bold">Leer DNI con la cámara</Text>
                </Pressable>
                <Text className="text-chido-texto-secundario-sobre-oscuro text-base mb-5" accessibilityLiveRegion="polite">{avisoDni ? 'Datos del DNI cargados. Revisalos antes de continuar.' : 'La lectura del DNI es opcional. También podés escribir los datos.'}</Text>
                {campos.map((campo, indice) => (
                  <View key={campo.id} onLayout={({ nativeEvent }) => { posiciones.current[campo.id] = nativeEvent.layout.y; }}>
                    <CampoFormulario
                      ref={(input) => { inputs.current[campo.id] = input; }}
                      etiqueta={campo.etiqueta} ayuda={campo.ayuda} error={errores[campo.id]}
                      value={valores[campo.id]} onChangeText={(valor) => editar(campo.id, valor)}
                      onFocus={alEnfocar} onBlur={() => validarCampo(campo.id)} placeholder={campo.placeholder} maxLength={campo.limite}
                      editable={!enviando}
                      keyboardType={campo.id === 'correo' ? 'email-address' : campo.id === 'dni' ? 'number-pad' : 'default'}
                      autoCapitalize={campo.id === 'nombres' || campo.id === 'apellidos' ? 'words' : 'none'}
                      autoCorrect={false}
                      secureTextEntry={(campo.id === 'password' || campo.id === 'confirmarPassword') && !mostrarPassword}
                      autoComplete={campo.id === 'correo' ? 'email' : campo.id === 'password' || campo.id === 'confirmarPassword' ? 'new-password' : 'off'}
                      returnKeyType={indice === campos.length - 1 ? 'done' : 'next'}
                      onSubmitEditing={() => { if (indice < campos.length - 1) inputs.current[campos[indice + 1].id]?.focus(); else void registrar(); }}
                    />
                  </View>
                ))}
                <Pressable disabled={enviando} onPress={() => setMostrarPassword((valor) => !valor)} accessibilityRole="button" accessibilityLabel={mostrarPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'} className="flex-row gap-3 items-center py-3 mb-4">
                  <Ionicons name={mostrarPassword ? 'eye-off-outline' : 'eye-outline'} size={26} color={colores.textoSobreOscuro} /><Text className="text-chido-texto-sobre-oscuro text-lg">{mostrarPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}</Text>
                </Pressable>
                {mensaje && <View className="mb-4"><ErrorFormulario mensaje={mensaje} /></View>}
                {enviando ? <ChidoLoader mensaje="Registrando cliente…" /> : <Pressable onPress={registrar} accessibilityRole="button" className="bg-chido-cabecera rounded-xl p-5"><Text className="text-chido-texto-sobre-oscuro text-xl text-center font-bold">{esMetre ? 'Registrar cliente' : 'Registrarme'}</Text></Pressable>}
                <Pressable disabled={enviando} onPress={volver} accessibilityRole="button" className="py-5"><Text className="text-chido-texto-sobre-oscuro text-lg font-bold text-center underline">{esMetre ? 'Volver al inicio' : 'Volver al ingreso'}</Text></Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
        {camara && <CamaraRegistro modo={camara} onClose={() => setCamara(null)} onFoto={(nueva) => { setFoto(nueva); setErrores((actual) => ({ ...actual, fotoBase64: undefined })); }} onDni={(datos) => { setValores((actual) => ({ ...actual, ...datos })); setErrores((actual) => ({ ...actual, nombres: undefined, apellidos: undefined, dni: undefined })); setAvisoDni(true); }} />}
      </SafeAreaView>
    </ImageBackground>
  );
}
