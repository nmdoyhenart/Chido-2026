import { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, Image, TouchableOpacity, Modal, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { colores } from '../../theme/colores';
import { obtenerListaEspera, suscribirseALista, eliminarDeLista, asignarMesaACliente, ClienteEnEspera } from '../../../lib/listaEspera';
import { useMesas } from '../../hooks/useMesas';

function obtenerMensajeError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return 'No se pudo asignar la mesa.';
}

export default function ListaEsperaMetre() {
    const [lista, setLista] = useState<ClienteEnEspera[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [eliminando, setEliminando] = useState<string | null>(null);
    const [asignando, setAsignando] = useState<string | null>(null);
    const [clienteParaAsignar, setClienteParaAsignar] = useState<ClienteEnEspera | null>(null);

    const { mesas, recargar: recargarMesas } = useMesas();

    useEffect(() => {
        cargarLista();
        recargarMesas();
        const desuscribirse = suscribirseALista('metre-lista-espera-pantalla', cargarLista);
        return desuscribirse;
    }, []);

    useFocusEffect(
        useCallback(() => {
            cargarLista();
            recargarMesas();
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

    function abrirSelectorMesa(cliente: ClienteEnEspera) {
        recargarMesas(true);
        setClienteParaAsignar(cliente);
    }

    async function confirmarAsignacion(mesaId: string) {
        if (!clienteParaAsignar) return;
        setAsignando(clienteParaAsignar.id);
        try {
            await asignarMesaACliente(clienteParaAsignar, mesaId);
            setClienteParaAsignar(null);
            // no hace falta sacar el item a mano del estado local: Realtime refresca la lista_espera solo
        } catch (err) {
            console.error('Error al asignar mesa:', err);
            Alert.alert('No se pudo asignar', obtenerMensajeError(err));
            recargarMesas(true);
        } finally {
            setAsignando(null);
        }
    }

    const mesasDisponibles = mesas.filter((mesa) => mesa.disponibilidad === 'vacía');

  return (
    <View className="flex-1" style={{ backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName={nombre} role="Metre" />

      <View className="flex-1 px-5 pt-5">
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio del metre"
          onPress={() => router.dismissTo('/metre/home')} className="self-start rounded-xl p-3 mb-3" style={{ backgroundColor: colores.cabecera }}>
          <Ionicons name="arrow-back" size={24} color={colores.textoSobreOscuro} />
        </TouchableOpacity>
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
                                <View className="flex-row items-center">
                                    <TouchableOpacity
                                        onPress={() => abrirSelectorMesa(item)}
                                        disabled={asignando === item.id || eliminando === item.id}
                                        style={{ padding: 8, marginRight: 4 }}
                                    >
                                        {asignando === item.id ? (
                                            <ActivityIndicator size="small" color={colores.textoSobreOscuro} />
                                        ) : (
                                            <Ionicons name="restaurant-outline" size={26} color={colores.textoSobreOscuro} />
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => eliminarCliente(item.id)}
                                        disabled={eliminando === item.id || asignando === item.id}
                                        style={{ padding: 8 }}
                                    >
                                        {eliminando === item.id ? (
                                            <ActivityIndicator size="small" color={colores.textoSobreOscuro} />
                                        ) : (
                                            <Ionicons name="trash-outline" size={28} color={colores.notificacion} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>

            <Modal
                visible={clienteParaAsignar !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setClienteParaAsignar(null)}
            >
                <View
                    className="flex-1 items-center justify-center px-6"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                    <View
                        className="w-full rounded-2xl p-5"
                        style={{ backgroundColor: colores.fondo, maxHeight: '70%' }}
                    >
                        <Text className="text-xl font-bold mb-4" style={{ color: colores.textoSobreOscuro }}>
                            Asignar mesa a {clienteParaAsignar?.nombre}
                        </Text>

                        {mesasDisponibles.length === 0 && (
                            <Text className="text-base mb-4" style={{ color: colores.textoSecundarioAlternativo }}>
                                No hay mesas disponibles en este momento.
                            </Text>
                        )}

                        <FlatList
                            data={mesasDisponibles}
                            keyExtractor={(mesa) => mesa.id}
                            renderItem={({ item: mesa }) => (
                                <TouchableOpacity
                                    onPress={() => confirmarAsignacion(mesa.id)}
                                    disabled={asignando !== null}
                                    className="flex-row items-center justify-between rounded-xl p-4 mb-3"
                                    style={{ backgroundColor: colores.superficieTerracota }}
                                >
                                    <Text className="text-lg font-semibold" style={{ color: colores.textoSobreOscuro }}>
                                        Mesa {mesa.numero}
                                    </Text>
                                    <Text className="text-sm" style={{ color: colores.textoSecundarioSobreOscuro }}>
                                        {mesa.cantidad_comensales} comensales
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />

                        <TouchableOpacity
                            onPress={() => setClienteParaAsignar(null)}
                            style={{ marginTop: 8, alignSelf: 'center' }}
                        >
                            <Text className="text-base" style={{ color: colores.textoSecundarioAlternativo }}>
                                Cancelar
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
