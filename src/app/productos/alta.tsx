import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Image, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { crearProducto, TipoProducto, subirFotos, existeProducto } from '../../../lib/productos';
import { Header } from '../../components/Header';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export default function AltaPlato() {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [tiempoElaboracion, setTiempoElaboracion] = useState('');
    const [precio, setPrecio] = useState('');
    const [tipo, setTipo] = useState<TipoProducto>('plato');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [fotos, setFotos] = useState<(string| null)[]>([null,null,null])
    const router = useRouter();
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [indiceSeleccionado, setIndiceSeleccionado] = useState<number | null>(null);
    const [exito, setExito] = useState(false);
    const [errores, setErrores] = useState<Record<string, string>>({});

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
        <View className="flex-1 bg-[#d97736] ">
            <Stack.Screen options={{ headerShown: false }} />
            <Header userName='Emmanuel Martín' role='Cocinero'/>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView className="flex-1 p-5" keyboardShouldPersistTaps="handled">
                    <View className="flex-row items-center mb-8 relative">
                        <Pressable
                            onPress={() => router.back()}
                            className="w-10 h-10 rounded-xl bg-[#b35e25] items-center justify-center absolute left-0 z-10"
                        >
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                        </Pressable>
                        <Text className="text-2xl font-bold text-white text-center flex-1">Alta de plato</Text>
                    </View>

                    <View className="mb-4">
                        <Text className="text-white text-sm mb-2 ml-1">Fotos del plato</Text>
                        <View className="flex-row gap-3">
                            <Pressable
                                onPress={() => abrirSelector(0)}
                                className="flex-1 aspect-square rounded-2xl border-2 border-dashed border-[#e6b18c] bg-[#b35e25] items-center justify-center overflow-hidden"
                            >
                                {fotos[0] ? (
                                    <Image source={{ uri: fotos[0] }} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="image-outline" size={28} color="#fff" />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={() => abrirSelector(1)}
                                className="flex-1 aspect-square rounded-2xl border-2 border-dashed border-[#e6b18c] bg-[#b35e25] items-center justify-center overflow-hidden"
                            >
                                {fotos[1] ? (
                                    <Image source={{ uri: fotos[1] }} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="image-outline" size={28} color="#fff" />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={() => abrirSelector(2)}
                                className="flex-1 aspect-square rounded-2xl border-2 border-dashed border-[#e6b18c] bg-[#b35e25] items-center justify-center overflow-hidden"
                            >
                                {fotos[2] ? (
                                    <Image source={{ uri: fotos[2] }} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="image-outline" size={28} color="#fff" />
                                )}
                            </Pressable>
                        </View>
                        {errores.fotos && <Text className="text-red-300 text-xs mt-1 ml-1">{errores.fotos}</Text>}
                    </View>

                    <Input
                        label="Nombre"
                        value={nombre}
                        onChangeText={setNombre}
                        error={errores.nombre}
                    />

                    <Input
                        label="Descripción"
                        value={descripcion}
                        onChangeText={setDescripcion}
                        multiline
                        style={{ height: 100, textAlignVertical: 'top' }}
                        error={errores.descripcion}
                    />

                    <View className="flex-row gap-4">
                        <Input
                            label="Tiempo (min)"
                            value={tiempoElaboracion}
                            onChangeText={setTiempoElaboracion}
                            keyboardType="numeric"
                            containerClassName="flex-1"
                            error={errores.tiempoElaboracion}
                        />
                        <Input
                            label="Precio"
                            value={precio}
                            onChangeText={setPrecio}
                            keyboardType="numeric"
                            containerClassName="flex-1"
                            error={errores.precio}
                        />
                    </View>

                    {error !== '' && <Text className="text-red-400 font-bold mb-2">{error}</Text>}
                    {exito && <Text className="text-green-400 font-bold mb-2">¡Plato guardado con éxito!</Text>}   
                    
                    {cargando && <ActivityIndicator size="large" color="#ffffff" />}

                    <Pressable className="bg-[#9c5120] p-4 rounded-xl mt-4 mb-12 items-center" onPress={handleGuardar}>
                        <Text className="text-white font-bold text-lg">Guardar</Text>
                    </Pressable>

                    <Modal visible={selectorVisible} transparent animationType="fade">
                        <View className="flex-1 bg-black/50 items-center justify-center">
                            <View className="bg-[#9c5120] rounded-2xl p-4 w-64 gap-3">
                                <Pressable
                                    onPress={() => {
                                        if (indiceSeleccionado !== null) {
                                            tomarFoto(indiceSeleccionado);
                                        }
                                        setSelectorVisible(false);
                                    }}
                                    className="bg-[#b35e25] p-3 rounded-xl items-center"
                                >
                                    <Text className="text-white font-bold">Tomar foto</Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => {
                                        if (indiceSeleccionado !== null) {
                                            elegirDeGaleria(indiceSeleccionado);
                                        }
                                        setSelectorVisible(false);
                                    }}
                                    className="bg-[#b35e25] p-3 rounded-xl items-center"
                                >
                                    <Text className="text-white font-bold">Elegir de galería</Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => setSelectorVisible(false)}
                                    className="p-3 rounded-xl items-center"
                                >
                                    <Text className="text-white">Cancelar</Text>
                                </Pressable>
                            </View>
                        </View>
                    </Modal>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
    }