import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Header } from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores } from '../../theme/colores';
import { obtenerListaEspera, suscribirseALista } from '../../../lib/listaEspera';
import { obtenerMesas, suscribirseAMesas } from '../../services/mesas';
import { useAppSession } from '../../contexts/AppSessionContext';

export default function HomeMetre() {
    const router = useRouter();
    const { usuario } = useAppSession();
    const insets = useSafeAreaInsets();
    const [cantidadEsperando, setCantidadEsperando] = useState(0);
    const [mesas, setMesas] = useState({ ocupadas: 0, total: 0 });
    const porcentajeOcupadas = mesas.total > 0 ? (mesas.ocupadas / mesas.total) * 100 : 0;
    const nombreUsuario = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ').trim() || 'Metre';
    const primerNombre = usuario?.nombres?.trim().split(/\s+/)[0] || 'Metre';

    const cargarCantidad = useCallback(async () => {
        try {
            const data = await obtenerListaEspera();
            setCantidadEsperando(data.length);
        } catch (err) {
            console.error('Error al traer la cantidad de espera:', err);
        }
    }, []);

    const cargarMesas = useCallback(async () => {
        try {
            const data = await obtenerMesas();
            setMesas({
                ocupadas: data.filter((mesa) => mesa.disponibilidad === 'ocupada').length,
                total: data.length,
            });
        } catch (err) {
            console.error('Error al traer las mesas:', err);
        }
    }, []);

    useEffect(() => {
        const inicio = setTimeout(() => {
            void cargarCantidad();
            void cargarMesas();
        }, 0);
        const desuscribirseLista = suscribirseALista('home-metre-lista-espera', () => void cargarCantidad());
        const desuscribirseMesas = suscribirseAMesas('home-metre-mesas', () => void cargarMesas());
        return () => {
            clearTimeout(inicio);
            desuscribirseLista();
            desuscribirseMesas();
        };
    }, [cargarCantidad, cargarMesas]);

    useFocusEffect(
        useCallback(() => {
            void cargarCantidad();
            void cargarMesas();
        }, [cargarCantidad, cargarMesas])
    );

    return (
        <View className="flex-1" style={{ backgroundColor: colores.fondo }}>
            <Stack.Screen options={{ headerShown: false }} />
            <Header userName={nombreUsuario} role="Metre" />

            {/* paddingBottom con insets para que la barra de navegación de Android no tape las tarjetas */}
            <View
                className="flex-1 px-5 pt-5"
                style={{ paddingBottom: insets.bottom + 20, gap: 16 }}
            >
                <Text
                    className="text-4xl font-bold"
                    style={{ color: colores.textoSobreOscuro }}
                >
                    Hola, {primerNombre}
                </Text>

                {/* Mesas ocupadas — conectada a Realtime sobre la tabla mesas */}
                <View
                    className="rounded-3xl p-6 justify-center"
                    style={{ backgroundColor: colores.superficieTerracota, flex: 1 }}
                >
                    <View className="flex-row justify-between mb-4">
                        <Text className="text-2xl font-semibold" style={{ color: colores.textoSecundarioSobreOscuro }}>
                            Mesas ocupadas
                        </Text>
                        <Text className="text-2xl font-bold" style={{ color: colores.textoSobreOscuro }}>
                            {mesas.ocupadas}/{mesas.total}
                        </Text>
                    </View>
                    <View className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: colores.botonPrincipal }}>
                        <View className="h-4 rounded-full" style={{ width: `${porcentajeOcupadas}%`, backgroundColor: colores.textoSecundarioAlternativo }} />
                    </View>
                </View>

                    {/* Lista de espera — conectada a Realtime, navega a lista-espera.tsx */}
                    <TouchableOpacity
                        onPress={() => router.push('/metre/listaEspera')}
                        className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row px-6"
                    >
                        <Ionicons name="time-outline" size={44} color={colores.textoSobreOscuro} />
                        <Text className="flex-1 ml-4 text-chido-texto-sobre-oscuro font-bold text-3xl">Lista de espera</Text>
                        <View
                            className="rounded-full items-center justify-center"
                            style={{ width: 48, height: 48, backgroundColor: colores.notificacion }}
                        >
                            <Text className="text-xl font-bold" style={{ color: colores.textoSobreOscuro }}>
                                {cantidadEsperando}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Mapa del salón — sin destino todavía */}
                    <TouchableOpacity className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row px-6">
                        <Ionicons name="grid-outline" size={44} color={colores.textoSobreOscuro} />
                        <Text className="flex-1 ml-4 text-chido-texto-sobre-oscuro font-bold text-3xl">Mapa del salón</Text>
                        <Ionicons name="chevron-forward" size={32} color={colores.textoSobreOscuro} />
                    </TouchableOpacity>

                    {/* Registrar un cliente — reutiliza FormularioRegistroCliente vía (auth)/registro en modo metre */}
                    <TouchableOpacity
                        onPress={() => router.push('/(auth)/registro')}
                        className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row px-6"
                    >
                        <Ionicons name="person-add-outline" size={44} color={colores.textoSobreOscuro} />
                        <Text className="flex-1 ml-4 text-chido-texto-sobre-oscuro font-bold text-3xl">Registrar un cliente</Text>
                        <Ionicons name="chevron-forward" size={32} color={colores.textoSobreOscuro} />
                    </TouchableOpacity>
                </View>
            </View>
    );
}
