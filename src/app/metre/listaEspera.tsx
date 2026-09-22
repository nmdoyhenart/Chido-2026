import { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, Image, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { colores } from '../../theme/colores';
import { obtenerListaEspera, suscribirseALista, eliminarDeLista, ClienteEnEspera } from '../../../lib/listaEspera';

export default function ListaEsperaMetre() {
    const [lista, setLista] = useState<ClienteEnEspera[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [eliminando, setEliminando] = useState<string | null>(null);

    useEffect(() => {
        cargarLista();
        const desuscribirse = suscribirseALista('metre-lista-espera-pantalla', cargarLista);
        return desuscribirse;
    }, []);

    useFocusEffect(
        useCallback(() => {
            cargarLista();
        }, [])
    );

    async function cargarLista() {
        setError('');
        try {
            const data = await obtenerListaEspera();
            setLista(data);
        } catch (err) {
            console.error('Error al traer la lista de espera:', err);
            setError('No se pudo cargar la lista de espera.');
        } finally {
            setCargando(false);
        }
    }

    async function eliminarCliente(id: string) {
        setEliminando(id);
        try {
            await eliminarDeLista(id);
            // no hace falta sacar el item a mano del estado local: Realtime refresca la lista solo
        } catch (err) {
            console.error('Error al eliminar cliente:', err);
        } finally {
            setEliminando(null);
        }
    }

    return (
        <View className="flex-1" style={{ backgroundColor: colores.fondo }}>
            <Stack.Screen options={{ headerShown: false }} />
            <Header userName="Juan Ignacio Antunez" role="Metre" />

            <View className="flex-1 px-5 pt-5">
                <Text className="text-3xl font-bold mb-5" style={{ color: colores.textoSobreOscuro }}>
                    Lista de espera
                </Text>

                {cargando && (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={colores.textoSobreOscuro} />
                    </View>
                )}

                {!cargando && error !== '' && (
                    <View className="flex-1 items-center justify-center px-6">
                        <Text className="text-lg text-center" style={{ color: colores.error }}>
                            {error}
                        </Text>
                    </View>
                )}

                {!cargando && error === '' && lista.length === 0 && (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-lg text-center" style={{ color: colores.textoSecundarioAlternativo }}>
                            No hay clientes esperando en este momento.
                        </Text>
                    </View>
                )}

                {!cargando && error === '' && lista.length > 0 && (
                    <FlatList
                        data={lista}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <View
                                className="flex-row items-center rounded-2xl p-4 mb-4"
                                style={{ backgroundColor: colores.superficieTerracota }}
                            >
                                <Image
                                    source={{ uri: item.foto_url }}
                                    style={{ width: 56, height: 56, borderRadius: 28 }}
                                />
                                <View className="flex-1 ml-4">
                                    <Text className="text-xl font-semibold" style={{ color: colores.textoSobreOscuro }}>
                                        {item.nombre}
                                    </Text>
                                    <Text className="text-sm" style={{ color: colores.textoSecundarioSobreOscuro }}>
                                        {item.tipo_cliente === 'anonimo' ? 'Cliente anónimo' : 'Cliente registrado'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => eliminarCliente(item.id)}
                                    disabled={eliminando === item.id}
                                    style={{ padding: 8 }}
                                >
                                    {eliminando === item.id ? (
                                        <ActivityIndicator size="small" color={colores.textoSobreOscuro} />
                                    ) : (
                                        <Ionicons name="trash-outline" size={28} color={colores.notificacion} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
    );
}