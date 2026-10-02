import { useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Image, Modal, KeyboardAvoidingView, Platform, TextInput, TextInputProps } from 'react-native';
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

type CampoProps = TextInputProps & {
    label: string;
    error?: string;
    containerClassName?: string;
    inputClassName?: string;
};

// Versión más grande del Input compartido, sólo para esta pantalla
function Campo({ label, error, containerClassName = '', inputClassName = '', ...props }: CampoProps) {
    return (
        <View className={`mb-5 ${containerClassName}`}>
            <Text className="text-chido-texto-sobre-oscuro text-lg font-semibold mb-2 ml-1">{label}</Text>
            <TextInput
                className={`bg-chido-cabecera text-chido-texto-sobre-oscuro text-xl px-4 py-4 rounded-xl border border-chido-texto-boton-outline ${inputClassName}`}
                placeholderTextColor={colores.textoSecundarioAlternativo}
                {...props}
            />
            {error ? <Text className="text-chido-error text-base mt-1 ml-1">{error}</Text> : null}
        </View>
    );
}

export default function AltaBebida() {
    const { usuario } = useAppSession();
    const { bloquear, modal } = useRestriccionSimulacion();
    const nombreUsuario = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || 'Cantinero';
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [tiempoElaboracion, setTiempoElaboracion] = useState('');
    const [precio, setPrecio] = useState('');
    const [tipo] = useState<TipoProducto>('bebida');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [fotos, setFotos] = useState<(string| null)[]>([null,null,null])
    const router = useRouter();
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [indiceSeleccionado, setIndiceSeleccionado] = useState<number | null>(null);
    const [exito, setExito] = useState(false);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const scroll = useRef<ScrollView>(null);
    const { alDesplazar, alEnfocar, rellenoInferior } = useCampoVisibleConTeclado(scroll);

    function validar() {
        const nuevosErrores: Record<string, string> = {};

        if (!nombre.trim()) {
            nuevosErrores.nombre = 'Ingresá el nombre de la bebida.';
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
            nuevosErrores.fotos = 'Elegí las 3 fotos de la bebida.';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    }

    async function handleGuardar() {
        if (bloquear('agregar bebidas')) return;
        setError('');
        setExito(false);

        if (!validar()) {
            return;
        }

        setCargando(true);

        try {
            const yaExiste = await existeProducto(nombre);
            if (yaExiste) {
                setError('Ya existe una bebida con ese nombre en la carta.');
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
            <Header userName={nombreUsuario} role='Cantinero'/>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView ref={scroll} className="flex-1 p-5" contentContainerStyle={{ flexGrow: 1, paddingBottom: rellenoInferior }} keyboardShouldPersistTaps="handled" onScroll={alDesplazar} scrollEventThrottle={16}>
                    <View className="flex-row items-center mb-8 relative">
                        {router.canGoBack() && <Pressable
                            onPress={() => router.back()}
                            className="w-12 h-12 rounded-xl bg-chido-acento items-center justify-center absolute left-0 z-10"
                        >
                        <Ionicons name="arrow-back" size={26} color={colores.textoSobreOscuro} />
                        </Pressable>}
                        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro text-center flex-1">Alta de bebida</Text>
                    </View>

                    <View className="mb-5">
                        <Text className="text-chido-texto-sobre-oscuro text-lg font-semibold mb-2 ml-1">Fotos de la bebida</Text>
                        <View className="flex-row gap-3">
                            <Pressable
                                onPress={() => abrirSelector(0)}
                                className="flex-1 aspect-square rounded-2xl border-2 border-dashed border-chido-texto-secundario-alternativo bg-chido-acento items-center justify-center overflow-hidden"
                            >
                                {fotos[0] ? (
                                    <Image source={{ uri: fotos[0] }} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="image-outline" size={40} color={colores.textoSobreOscuro} />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={() => abrirSelector(1)}
                                className="flex-1 aspect-square rounded-2xl border-2 border-dashed border-chido-texto-secundario-alternativo bg-chido-acento items-center justify-center overflow-hidden"
                            >
                                {fotos[1] ? (
                                    <Image source={{ uri: fotos[1] }} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="image-outline" size={40} color={colores.textoSobreOscuro} />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={() => abrirSelector(2)}
                                className="flex-1 aspect-square rounded-2xl border-2 border-dashed border-chido-texto-secundario-alternativo bg-chido-acento items-center justify-center overflow-hidden"
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
                        label="Nombre"
                        onFocus={alEnfocar}
                        value={nombre}
                        onChangeText={setNombre}
                        error={errores.nombre}
                    />

                    <Campo
                        label="Descripción"
                        onFocus={alEnfocar}
                        value={descripcion}
                        onChangeText={setDescripcion}
                        multiline
                        containerClassName="flex-1"
                        inputClassName="flex-1"
                        style={{ minHeight: 140, textAlignVertical: 'top' }}
                        error={errores.descripcion}
                    />

                    <View className="flex-row gap-4">
                        <Campo
                            label="Tiempo (min)"
                            onFocus={alEnfocar}
                            value={tiempoElaboracion}
                            onChangeText={setTiempoElaboracion}
                            keyboardType="numeric"
                            containerClassName="flex-1"
                            error={errores.tiempoElaboracion}
                        />
                        <Campo
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
                    {exito && <Text className="text-chido-exito text-lg font-bold mb-2">¡Bebida guardada con éxito!</Text>}

                    {cargando && <ActivityIndicator size="large" color={colores.textoSobreOscuro} />}

                    <Pressable className="bg-chido-cabecera p-5 rounded-xl mt-4 mb-8 items-center" onPress={handleGuardar}>
                        <Text className="text-chido-texto-sobre-oscuro font-bold text-xl">Guardar</Text>
                    </Pressable>

                    <Modal visible={selectorVisible} transparent animationType="fade">
                        <View className="flex-1 bg-chido-cabecera/50 items-center justify-center">
                            <View className="bg-chido-cabecera rounded-2xl p-5 w-80 gap-4">
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
