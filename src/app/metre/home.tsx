import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Header } from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { obtenerListaEspera, suscribirseALista } from '../../../lib/listaEspera';
import { useAppSession } from '../../contexts/AppSessionContext';

export default function HomeMetre() {
  const router = useRouter();
  const { usuario } = useAppSession();
  const nombre = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || 'Metre';
  const [cantidadEsperando, setCantidadEsperando] = useState(0);

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
        <View className="flex-1 bg-chido-fondo">
            <Stack.Screen options={{ headerShown: false }} />
            <Header userName={nombre} role="Metre" />


            <View className="flex-1 p-5 pt-6">
                <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro mb-6">
                    Hola, Juan
                </Text>

                <View className="flex-1 gap-4 mb-4">
                    {/* Mesas ocupadas — número fijo por ahora, pendiente conectar a datos reales */}
                    <View className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center px-6">
                        <View className="flex-row justify-between mb-4">
                            <Text className="text-chido-texto-secundario-sobre-oscuro text-2xl font-semibold">
                                Mesas ocupadas
                            </Text>
                            <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold">
                                8/12
                            </Text>
                        </View>
                        <View className="h-4 rounded-full overflow-hidden bg-chido-fondo">
                            <View className="h-4 rounded-full bg-chido-texto-secundario-alternativo" style={{ width: '66%' }} />
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
