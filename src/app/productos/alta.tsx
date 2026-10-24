import { useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Image, Modal, KeyboardAvoidingView, Platform, TextInput, TextInputProps, useWindowDimensions } from 'react-native';
import { crearProducto, TipoProducto, subirFotos, existeProducto } from '../../../lib/productos';
import { Header } from '../../components/Header';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { colores } from '../../theme/colores';
import { useAppSession } from '../../contexts/AppSessionContext';
import { useRestriccionSimulacion } from '../../components/ui/RestriccionSimulacion';
import { useCampoVisibleConTeclado } from '../../hooks/useCampoVisibleConTeclado';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVibrarError } from '../../hooks/useVibrarError';

type CampoProps = TextInputProps & {
    label: string;
    error?: string;
    containerClassName?: string;
    inputClassName?: string;
    compacto?: boolean;
};

// Alto aproximado del Header (pt-14 + avatar + pb-6)
const ALTO_HEADER = 144;
// Por debajo de este alto disponible se usa la versión compacta para que todo entre sin scroll
const ALTO_MINIMO_NORMAL = 800;

// Versión más grande del Input compartido, sólo para esta pantalla
function Campo({ label, error, compacto = false, containerClassName = '', inputClassName = '', ...props }: CampoProps) {
    return (
        <View className={`${compacto ? 'mb-3' : 'mb-5'} ${containerClassName}`}>
            <Text className={`text-chido-texto-sobre-oscuro font-semibold ml-1 ${compacto ? 'text-base mb-1' : 'text-lg mb-2'}`}>{label}</Text>
            <TextInput
                className={`bg-chido-cabecera text-chido-texto-sobre-oscuro px-4 rounded-xl border border-chido-texto-boton-outline ${compacto ? 'text-lg py-2.5' : 'text-xl py-4'} ${inputClassName}`}
                placeholderTextColor={colores.textoSecundarioAlternativo}
                {...props}
            />
            {error ? <Text className="text-chido-error text-base mt-1 ml-1">{error}</Text> : null}
        </View>
    );
}


export default function AltaPlato() {
    const { usuario, role } = useAppSession();
    // También la usan Dueño y Supervisor desde "Gestionar carta": se muestra el rol real.
    const rolVisible = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Cocinero';
    const { bloquear, modal } = useRestriccionSimulacion();
    const nombreUsuario = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || 'Cocinero';

    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [tiempoElaboracion, setTiempoElaboracion] = useState('');
    const [precio, setPrecio] = useState('');
    const [tipo] = useState<TipoProducto>('plato');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    useVibrarError(error);
    const [fotos, setFotos] = useState<(string| null)[]>([null,null,null])
    const router = useRouter();
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [indiceSeleccionado, setIndiceSeleccionado] = useState<number | null>(null);
    const [exito, setExito] = useState(false);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const scroll = useRef<ScrollView>(null);
    const { alDesplazar, alEnfocar, rellenoInferior } = useCampoVisibleConTeclado(scroll);
    const insets = useSafeAreaInsets();
    const { height, width } = useWindowDimensions();
    // Ancho de cada foto: pantalla menos el p-5 de los costados y los dos gap-3 entre fotos
    const anchoFoto = (width - 40 - 24) / 3;
    // Espacio entre el Header y los botones del sistema (barra de navegación de Android o barra de gestos de iPhone)
    const altoDisponible = height - ALTO_HEADER - insets.bottom;
    const compacto = altoDisponible < ALTO_MINIMO_NORMAL;

    function validar() {
        const nuevosErrores: Record<string, string> = {};

        if (!nombre.trim()) {
            nuevosErrores.nombre = 'Ingresá el nombre del plato.';
        }

        if (!descripcion.trim()) {
            nuevosErrores.descripcion = 'Ingresá una descripción.';
        }

        if (!tiempoElaboracion.trim()) {
            nuevosErrores.tiempoElaboracion = 'Ingresá el tiempo de elaboración.';
        } else if (!/^\d+$/.test(tiempoElaboracion) || Number(tiempoElaboracion) <= 0) {
            nuevosErrores.tiempoElaboracion = 'Tiene que ser un número entero mayor a 0.';
        }

        if (!precio.trim()) {
            nuevosErrores.precio = 'Ingresá el precio.';
        } else if (!/^\d+(\.\d{1,2})?$/.test(precio) || Number(precio) <= 0) {
            nuevosErrores.precio = 'Tiene que ser un número mayor a 0 (hasta 2 decimales).';
        }

        if (fotos.some((foto) => foto === null)) {
            nuevosErrores.fotos = 'Elegí las 3 fotos del plato.';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    }

    async function handleGuardar() {
        if (bloquear('agregar platos')) return;
        setError('');
        setExito(false);

        if (!validar()) {
            return;
        }

        setCargando(true);

        try {
            const yaExiste = await existeProducto(nombre);
            if (yaExiste) {
                setError('Ya existe un plato con ese nombre en la carta.');
                return;
            }

            const urlsFotos = await subirFotos(fotos);

            const nuevoProducto = {
                nombre: nombre,
                descripcion: descripcion,
                tiempo_elaboracion: Number(tiempoElaboracion),
                precio: Number(precio),
                fotos: urlsFotos,
                tipo: tipo,
            };
            await crearProducto(nuevoProducto);

            setNombre('');
            setDescripcion('');
            setTiempoElaboracion('');
            setPrecio('');
            setFotos([null, null, null]);
            setErrores({});
            setExito(true);

        } catch (err) {
            console.error('Error al guardar el producto:', err);
            setError('No se pudo guardar el producto. Probá de nuevo.');
        } finally {
            setCargando(false)
        }
    }

    async function elegirDeGaleria(index: number) {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) {
            return;
        }

        const resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.5,
        });

        if (resultado.canceled) {
            return;
        }

        const uri = resultado.assets[0].uri;

        const contexto = ImageManipulator.manipulate(uri);
        const imagenRenderizada = await contexto.renderAsync();
        const convertida = await imagenRenderizada.saveAsync({
            compress: 0.5,
            format: SaveFormat.JPEG,
        });

        setFotos((fotosAnteriores) => {
            const nuevasFotos = [...fotosAnteriores];
            nuevasFotos[index] = convertida.uri;
            return nuevasFotos;
        });
    }

    async function tomarFoto(index: number) {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
            return;
        }

        const resultado = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.5,
        });

        if (resultado.canceled) {
            return;
        }

        const uri = resultado.assets[0].uri;

        const contexto = ImageManipulator.manipulate(uri);
        const imagenRenderizada = await contexto.renderAsync();
        const convertida = await imagenRenderizada.saveAsync({
            compress: 0.5,
            format: SaveFormat.JPEG,
        });

        setFotos((fotosAnteriores) => {
            const nuevasFotos = [...fotosAnteriores];
            nuevasFotos[index] = convertida.uri;
            return nuevasFotos;
        });
    }

    function abrirSelector(index: number) {
        setIndiceSeleccionado(index);
        setSelectorVisible(true);
    }

    return (
        <View className="flex-1 bg-chido-fondo ">
            <Stack.Screen options={{ headerShown: false }} />
            {modal}
            <Header userName={nombreUsuario} role={rolVisible}/>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView ref={scroll} className="flex-1 p-5" contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 + insets.bottom + rellenoInferior }} bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScroll={alDesplazar} scrollEventThrottle={16}>
                    <View className={`flex-row items-center relative ${compacto ? 'mb-3' : 'mb-8'}`}>
                        {router.canGoBack() && <Pressable
                            onPress={() => router.back()}
                            className="w-12 h-12 rounded-xl bg-chido-acento items-center justify-center absolute left-0 z-10"
                        >
                        <Ionicons name="arrow-back" size={26} color={colores.textoSobreOscuro} />
                        </Pressable>}
                        <Text className={`font-bold text-chido-texto-sobre-oscuro text-center flex-1 ${compacto ? 'text-2xl' : 'text-3xl'}`}>Alta de plato</Text>
                    </View>

                    {/* Las fotos crecen con el espacio libre hasta quedar cuadradas; lo que sobra después lo toma la descripción */}
                    <View className={`flex-1 ${compacto ? 'mb-3' : 'mb-5'}`} style={{ maxHeight: anchoFoto + (compacto ? 28 : 36) + (errores.fotos ? 28 : 0) }}>
                        <Text className={`text-chido-texto-sobre-oscuro font-semibold ml-1 ${compacto ? 'text-base mb-1' : 'text-lg mb-2'}`}>Fotos del plato</Text>
                        <View className="flex-row gap-3 flex-1" style={{ minHeight: 80 }}>
                            <Pressable
                                onPress={() => abrirSelector(0)}
                                className={`flex-1 rounded-2xl border-2 border-dashed border-chido-texto-secundario-alternativo bg-chido-acento items-center justify-center overflow-hidden`}
                            >
                                {fotos[0] ? (
                                    <Image source={{ uri: fotos[0] }} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="image-outline" size={40} color={colores.textoSobreOscuro} />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={() => abrirSelector(1)}
                                className={`flex-1 rounded-2xl border-2 border-dashed border-chido-texto-secundario-alternativo bg-chido-acento items-center justify-center overflow-hidden`}
                            >
                                {fotos[1] ? (
                                    <Image source={{ uri: fotos[1] }} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="image-outline" size={40} color={colores.textoSobreOscuro} />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={() => abrirSelector(2)}
                                className={`flex-1 rounded-2xl border-2 border-dashed border-chido-texto-secundario-alternativo bg-chido-acento items-center justify-center overflow-hidden`}
                            >
                                {fotos[2] ? (
                                    <Image source={{ uri: fotos[2] }} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="image-outline" size={40} color={colores.textoSobreOscuro} />
                                )}
                            </Pressable>
                        </View>
                        {errores.fotos && <Text className="text-chido-error text-base mt-1 ml-1">{errores.fotos}</Text>}
                    </View>

                    <Campo
                        compacto={compacto}
                        label="Nombre"
                        onFocus={alEnfocar}
                        value={nombre}
                        onChangeText={setNombre}
                        error={errores.nombre}
                    />

                    <Campo
                        compacto={compacto}
                        label="Descripción"
                        onFocus={alEnfocar}
                        value={descripcion}
                        onChangeText={setDescripcion}
                        multiline
                        containerClassName="flex-1"
                        inputClassName="flex-1"
                        style={{ minHeight: compacto ? 56 : 80, textAlignVertical: 'top' }}
                        error={errores.descripcion}
                    />

                    <View className="flex-row gap-4">
                        <Campo
                            label="Tiempo "
                            value={tiempoElaboracion}
                            onChangeText={setTiempoElaboracion}
                            keyboardType="numeric"
                            containerClassName="flex-1"
                            error={errores.tiempoElaboracion}
                        />
                        <Campo
                            compacto={compacto}
                            label="Precio"
                            onFocus={alEnfocar}
                            value={precio}
                            onChangeText={setPrecio}
                            keyboardType="numeric"
                            containerClassName="flex-1"
                            error={errores.precio}
                        />
                    </View>

                    {error !== '' && <Text className="text-chido-error text-lg font-bold mb-2">{error}</Text>}
                    {exito && <Text className="text-chido-exito text-lg font-bold mb-2">¡Plato guardado con éxito!</Text>}

                    {cargando && <ActivityIndicator size="large" color={colores.textoSobreOscuro} />}

                    <Pressable className={`bg-chido-cabecera rounded-xl items-center ${compacto ? 'p-3.5 mt-1' : 'p-5 mt-4'}`} onPress={handleGuardar}>
                        <Text className="text-chido-texto-sobre-oscuro font-bold text-xl">Guardar</Text>
                    </Pressable>

                    <Modal visible={selectorVisible} transparent animationType="fade">
                        {/* Fondo oscuro y borde, como ResultadoModal, para que el selector se destaque del formulario. */}
                        <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(42,20,12,0.75)' }}>
                            <View className="bg-chido-cabecera rounded-2xl p-5 w-80 gap-4" style={{ borderWidth: 1, borderColor: colores.bordeNaranja }}>
                                <Pressable
                                    onPress={() => {
                                        if (indiceSeleccionado !== null) {
                                            tomarFoto(indiceSeleccionado);
                                        }
                                        setSelectorVisible(false);
                                    }}
                                    className="bg-chido-acento p-4 rounded-xl items-center"
                                >
                                    <Text className="text-chido-texto-sobre-oscuro font-bold text-lg">Tomar foto</Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => {
                                        if (indiceSeleccionado !== null) {
                                            elegirDeGaleria(indiceSeleccionado);
                                        }
                                        setSelectorVisible(false);
                                    }}
                                    className="bg-chido-acento p-4 rounded-xl items-center"
                                >
                                    <Text className="text-chido-texto-sobre-oscuro font-bold text-lg">Elegir de galería</Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => setSelectorVisible(false)}
                                    className="p-4 rounded-xl items-center"
                                >
                                    <Text className="text-chido-texto-sobre-oscuro text-lg">Cancelar</Text>
                                </Pressable>
                            </View>
                        </View>
                    </Modal>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
    }
