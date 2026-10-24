import { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, Image, TouchableOpacity, Modal } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { colores } from '../../theme/colores';
import { obtenerListaEspera, suscribirseALista, eliminarDeLista, asignarMesaACliente, ClienteEnEspera } from '../../../lib/listaEspera';
import { useMesas } from '../../hooks/useMesas';
import { useAppSession } from '../../contexts/AppSessionContext';
import { useAvisoResultado } from '../../hooks/useAvisoResultado';
import { useVibrarError } from '../../hooks/useVibrarError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';

const CLIENTES_POR_PAGINA = 4;

function obtenerMensajeError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return 'No se pudo asignar la mesa.';
}

export default function ListaEsperaMetre() {
    const router = useRouter();
    const { usuario } = useAppSession();
    const { mostrarAviso, modalAviso } = useAvisoResultado();
    const nombre = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ').trim() || 'Metre';
    const [lista, setLista] = useState<ClienteEnEspera[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    useVibrarError(error);
    const [eliminando, setEliminando] = useState<string | null>(null);
    const [asignando, setAsignando] = useState<string | null>(null);
    const [clienteParaAsignar, setClienteParaAsignar] = useState<ClienteEnEspera | null>(null);
    const [altoLista, setAltoLista] = useState(0);

    const { mesas, recargar: recargarMesas } = useMesas();
    const insets = useSafeAreaInsets();

    const cargarLista = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        const inicio = setTimeout(() => {
            void cargarLista();
            void recargarMesas();
        }, 0);
        const desuscribirse = suscribirseALista('metre-lista-espera-pantalla', cargarLista);
        return () => {
            clearTimeout(inicio);
            desuscribirse();
        };
    }, [cargarLista, recargarMesas]);

    useFocusEffect(
        useCallback(() => {
            const inicio = setTimeout(() => {
                void cargarLista();
                void recargarMesas();
            }, 0);
            return () => clearTimeout(inicio);
        }, [cargarLista, recargarMesas])
    );

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
            setClienteParaAsignar(null);
            mostrarAviso('No se pudo asignar la mesa', obtenerMensajeError(err));
            recargarMesas(true);
        } finally {
            setAsignando(null);
        }
    }

    const mesasDisponibles = mesas.filter((mesa) => mesa.disponibilidad === 'vacía');
    // Cada cliente ocupa un cuarto del alto de la lista (incluye el mb-4 de la tarjeta)
    const altoItem = Math.floor(altoLista / CLIENTES_POR_PAGINA);
    const totalPaginas = Math.ceil(lista.length / CLIENTES_POR_PAGINA);
    const altoRelleno = (totalPaginas * CLIENTES_POR_PAGINA - lista.length) * altoItem;

  return (
    <View className="flex-1" style={{ backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header userName={nombre} role="Metre" />

      {/* El paddingBottom deja la lista por encima de la barra de navegación de Android */}
      <View className="flex-1 px-5 pt-5" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <View className="flex-row items-center mb-5">
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio del metre"
            onPress={() => router.push('/metre/home')} className="rounded-xl p-3 mr-4" style={{ backgroundColor: colores.cabecera }}>
            <Ionicons name="arrow-back" size={28} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
          <Text className="text-3xl font-bold flex-1" style={{ color: colores.textoSobreOscuro }}>
            Lista de espera
          </Text>
        </View>

                {cargando && (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={colores.textoSobreOscuro} />
                    </View>
                )}

                {!cargando && error !== '' && (
                    <View className="flex-1 items-center justify-center px-6">
                        <Text className="text-xl text-center" style={{ color: colores.error }}>
                            {error}
                        </Text>
                    </View>
                )}

                {!cargando && error === '' && lista.length === 0 && (
                    <View className="flex-1 items-center justify-center">
                        <EstadoVacio mensaje="Nada para mostrar" />
                    </View>
                )}

                {!cargando && error === '' && lista.length > 0 && (
                    <View className="flex-1" onLayout={({ nativeEvent }) => setAltoLista(Math.floor(nativeEvent.layout.height))}>
                    {altoItem > 0 && (
                    <FlatList
                        data={lista}
                        keyExtractor={(item) => item.id}
                        // Cada scroll avanza exactamente una página de CLIENTES_POR_PAGINA
                        snapToInterval={altoItem * CLIENTES_POR_PAGINA}
                        decelerationRate="fast"
                        disableIntervalMomentum
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        getItemLayout={(_, index) => ({ length: altoItem, offset: altoItem * index, index })}
                        // Completa la última página para que también quede alineada al snap
                        ListFooterComponent={<View style={{ height: altoRelleno }} />}
                        renderItem={({ item }) => (
                            <View style={{ height: altoItem }}>
                            <View
                                className="flex-1 flex-row items-center rounded-2xl p-4 mb-4"
                                style={{ backgroundColor: colores.superficieTerracota }}
                            >
                                <Image
                                    source={{ uri: item.foto_url }}
                                    style={{ width: 64, height: 64, borderRadius: 32 }}
                                />
                                <View className="flex-1 ml-4">
                                    <Text className="text-2xl font-semibold" numberOfLines={1} style={{ color: colores.textoSobreOscuro }}>
                                        {item.nombre}
                                    </Text>
                                    <Text className="text-lg" style={{ color: colores.textoSecundarioSobreOscuro }}>
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
                                            <Ionicons name="restaurant-outline" size={30} color={colores.textoSobreOscuro} />
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
                                            <Ionicons name="trash-outline" size={32} color={colores.notificacion} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                            </View>
                        )}
                    />
                    )}
                    </View>
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
                        <Text className="text-2xl font-bold mb-4" style={{ color: colores.textoSobreOscuro }}>
                            Asignar mesa a {clienteParaAsignar?.nombre}
                        </Text>

                        {mesasDisponibles.length === 0 && (
                            <Text className="text-lg mb-4" style={{ color: colores.textoSecundarioAlternativo }}>
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
                                    <Text className="text-xl font-semibold" style={{ color: colores.textoSobreOscuro }}>
                                        Mesa {mesa.numero}
                                    </Text>
                                    <Text className="text-lg" style={{ color: colores.textoSecundarioSobreOscuro }}>
                                        {mesa.cantidad_comensales} comensales
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />

                        <TouchableOpacity
                            onPress={() => setClienteParaAsignar(null)}
                            style={{ marginTop: 8, alignSelf: 'center' }}
                        >
                            <Text className="text-lg" style={{ color: colores.textoSecundarioAlternativo }}>
                                Cancelar
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {modalAviso}
        </View>
    );
}
