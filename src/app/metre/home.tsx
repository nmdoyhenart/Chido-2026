import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { obtenerListaEspera, suscribirseALista } from '../../../lib/listaEspera';

export default function HomeMetre() {
    const router = useRouter();
    const [cantidadEsperando, setCantidadEsperando] = useState(0);
    const [errorLista, setErrorLista] = useState(false);

    const cargarCantidad = useCallback(async () => {
        try {
            const data = await obtenerListaEspera();
            setCantidadEsperando(data.length);
            setErrorLista(false);
        } catch (err) {
            console.error('Error al traer la cantidad de espera:', err);
            setErrorLista(true);
        }
    }, []);

    useEffect(() => {
        const inicial = setTimeout(() => { void cargarCantidad(); }, 0);
        const desuscribirse = suscribirseALista('home-metre-lista-espera', cargarCantidad);
        const intervalo = setInterval(() => { void cargarCantidad(); }, 7000);
        return () => { clearTimeout(inicial); clearInterval(intervalo); desuscribirse(); };
    }, [cargarCantidad]);

    useFocusEffect(
        useCallback(() => {
            void cargarCantidad();
        }, [cargarCantidad])
    );

    return (
        <View className="flex-1" style={{ backgroundColor: colores.fondo }}>
            <Stack.Screen options={{ headerShown: false }} />
            <Header userName="Juan Ignacio Antunez" role="Metre" />

            <View className="flex-1 px-5 pt-5 pb-6">
                <Text
                    className="text-4xl font-bold mb-5"
                    style={{ color: colores.textoSobreOscuro }}
                >
                    Hola, Juan
                </Text>

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
                    className="rounded-3xl p-6 mb-5 flex-row items-center"
                    style={{ backgroundColor: colores.superficieTerracota, flex: 1.4 }}
                    onPress={() => router.push('/metre/listaEspera')}
                >
                    <View
                        className="rounded-full items-center justify-center mr-4"
                        style={{ width: 64, height: 64, backgroundColor: colores.botonPrincipal }}
                    >
                        <Ionicons name="time-outline" size={36} color={colores.textoSobreOscuro} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-2xl font-semibold" style={{ color: colores.textoSobreOscuro }}>
                            Lista de espera
                        </Text>
                        <Text className="text-base mt-1" style={{ color: colores.textoSecundarioSobreOscuro }}>
                            Clientes esperando una mesa disponible
                        </Text>
                    </View>
                    <View
                        className="rounded-full items-center justify-center"
                        style={{ width: 40, height: 40, backgroundColor: colores.notificacion }}
                    >
                        <Text className="text-lg font-bold" style={{ color: colores.textoSobreOscuro }}>
                            {errorLista ? '!' : cantidadEsperando}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Mapa del salón — sin destino todavía */}
                <TouchableOpacity
                    className="rounded-3xl p-6 flex-row items-center"
                    style={{ backgroundColor: colores.superficieTerracota, flex: 1.4 }}
                >
                    <View
                        className="rounded-full items-center justify-center mr-4"
                        style={{ width: 64, height: 64, backgroundColor: colores.botonPrincipal }}
                    >
                        <Ionicons name="grid-outline" size={36} color={colores.textoSobreOscuro} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-2xl font-semibold" style={{ color: colores.textoSobreOscuro }}>
                            Mapa del salón
                        </Text>
                        <Text className="text-base mt-1" style={{ color: colores.textoSecundarioSobreOscuro }}>
                            Vistá el estado de cada mesa
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={28} color={colores.textoSecundarioAlternativo} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
