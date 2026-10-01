import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Header } from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { obtenerListaEspera, suscribirseALista } from '../../../lib/listaEspera';
import { useAppSession } from '../../contexts/AppSessionContext';

export default function HomeMetre() {
    const router = useRouter();
    const { usuario } = useAppSession();
    const [cantidadEsperando, setCantidadEsperando] = useState(0);
    const nombreUsuario = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ').trim() || 'Metre';
    const primerNombre = usuario?.nombres?.trim().split(/\s+/)[0] || 'Metre';

    useEffect(() => {
        cargarCantidad();
        const desuscribirse = suscribirseALista('home-metre-lista-espera', cargarCantidad);
        return desuscribirse;
    }, []);

    useFocusEffect(
        useCallback(() => {
            cargarCantidad();
        }, [])
    );

    async function cargarCantidad() {
        try {
            const data = await obtenerListaEspera();
            setCantidadEsperando(data.length);
        } catch (err) {
            console.error('Error al traer la cantidad de espera:', err);
        }
    }

    return (
        <View className="flex-1" style={{ backgroundColor: colores.fondo }}>
            <Stack.Screen options={{ headerShown: false }} />
            <Header userName={nombreUsuario} role="Metre" />

            <View className="flex-1 px-5 pt-5 pb-6">
                <Text
                    className="text-4xl font-bold mb-5"
                    style={{ color: colores.textoSobreOscuro }}
                >
                    Hola, {primerNombre}
                </Text>

                <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => router.push('/(auth)/registro')}
                    className="rounded-2xl px-4 py-3 mb-5 flex-row items-center justify-center"
                    style={{ backgroundColor: colores.botonPrincipal, borderWidth: 1, borderColor: colores.textoSecundarioAlternativo, minHeight: 48 }}
                >
                    <Ionicons name="person-add-outline" size={24} color={colores.textoSobreOscuro} />
                    <Text className="text-lg font-bold ml-3" style={{ color: colores.textoSobreOscuro }}>Registrar cliente</Text>
                </TouchableOpacity>

                {/* Mesas ocupadas — número fijo por ahora, pendiente conectar a datos reales */}
                <View
                    className="rounded-3xl p-6 mb-5 justify-center"
                    style={{ backgroundColor: colores.superficieTerracota, flex: 1 }}
                >
                    <View className="flex-row justify-between mb-4">
                        <Text className="text-2xl font-semibold" style={{ color: colores.textoSecundarioSobreOscuro }}>
                            Mesas ocupadas
                        </Text>
                        <Text className="text-2xl font-bold" style={{ color: colores.textoSobreOscuro }}>
                            8/12
                        </Text>
                    </View>
                    <View className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: colores.botonPrincipal }}>
                        <View className="h-4 rounded-full" style={{ width: '66%', backgroundColor: colores.textoSecundarioAlternativo }} />
                    </View>
                </View>

                    {/* Lista de espera — conectada a Realtime, navega a lista-espera.tsx */}
                    <TouchableOpacity
                        onPress={() => router.push('/metre/listaEspera')}
                        className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row px-6"
                    >
                        <Ionicons name="time-outline" size={36} color={colores.textoSobreOscuro} className="mr-4" />
                        <View className="flex-1 ml-4">
                            <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl">Lista de espera</Text>
                            <Text className="text-chido-texto-secundario-sobre-oscuro text-base mt-1">
                                Clientes esperando una mesa disponible
                            </Text>
                        </View>
                        <View
                            className="rounded-full items-center justify-center"
                            style={{ width: 40, height: 40, backgroundColor: colores.notificacion }}
                        >
                            <Text className="text-lg font-bold" style={{ color: colores.textoSobreOscuro }}>
                                {cantidadEsperando}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Mapa del salón — sin destino todavía */}
                    <TouchableOpacity className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row px-6">
                        <Ionicons name="grid-outline" size={36} color={colores.textoSobreOscuro} className="mr-4" />
                        <View className="flex-1 ml-4">
                            <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl">Mapa del salón</Text>
                            <Text className="text-chido-texto-secundario-sobre-oscuro text-base mt-1">
                                Vistá el estado de cada mesa
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={28} color={colores.textoSobreOscuro} />
                    </TouchableOpacity>

                    {/* Registrar un cliente — reutiliza FormularioRegistroCliente vía (auth)/registro en modo metre */}
                    <TouchableOpacity
                        onPress={() => router.push('/(auth)/registro')}
                        className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row px-6"
                    >
                        <Ionicons name="person-add-outline" size={36} color={colores.textoSobreOscuro} className="mr-4" />
                        <View className="flex-1 ml-4">
                            <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl">Registrar un cliente</Text>
                            <Text className="text-chido-texto-secundario-sobre-oscuro text-base mt-1">
                                Dar de alta un nuevo cliente
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={28} color={colores.textoSobreOscuro} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}