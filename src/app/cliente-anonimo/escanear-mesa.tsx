import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../../theme/colores';
import { obtenerClienteEnListaPorId } from '../../../lib/clientesAnonimos';
import { parseQrPayload } from '../../utils/qr';
import { QRScanner } from '../../components/ui/QRScanner';
import { confirmarMesaAnonima } from '../../services/pedidos.service';

const CLIENTE_ANONIMO_ID_KEY = 'cliente_anonimo_id';
const CLIENTE_ANONIMO_NOMBRE_KEY = 'cliente_anonimo_nombre';
const CLIENTE_ANONIMO_FOTO_KEY = 'cliente_anonimo_foto_url';

export default function EscanearMesa() {

    const [escaneando, setEscaneando] = useState(true);
    const [mensaje, setMensaje] = useState('');
    const miMesaId = useRef<string | null>(null);
    const clienteAnonimoId = useRef<string | null>(null);
    const mesaConfirmada = useRef(false);

    useEffect(() => {
        (async () => {
            const identificador = await AsyncStorage.getItem(CLIENTE_ANONIMO_ID_KEY);
            if (!identificador) {
                router.push('/cliente-anonimo/alta');
                return;
            }
            clienteAnonimoId.current = identificador;

            try {
                const clienteEnLista = await obtenerClienteEnListaPorId(identificador);
                if (!clienteEnLista || clienteEnLista.estado !== 'asignado' || !clienteEnLista.mesa_id) {
                    setEscaneando(false);
                    setMensaje('Todavía no tenés una mesa asignada.');
                    return;
                }
                miMesaId.current = clienteEnLista.mesa_id;
            } catch (err) {
                console.error(err);
                setEscaneando(false);
                setMensaje('No se pudo verificar tu mesa asignada. Intentá de nuevo.');
            }
        })();
    }, []);

    const abrirScanner = () => {
        if (!miMesaId.current) return;
        setMensaje('');
        setEscaneando(true);
    };

    const cerrarScanner = () => {
        setEscaneando(false);
        if (!mesaConfirmada.current && router.canGoBack()) router.back();
    };

    const confirmarMesa = async (data: string) => {
        if (!miMesaId.current) {
            throw new Error('Estamos verificando tu mesa asignada. Probá de nuevo en un momento.');
        }

        const payload = parseQrPayload(data);

        if (!payload || payload.tipo !== 'mesa') {
            throw new Error('Este código QR no corresponde a una mesa.');
        }

        if (payload.mesaId !== miMesaId.current) {
            throw new Error('Esta no es tu mesa asignada. Fijate el número con el metre.');
        }

        if (!clienteAnonimoId.current) {
            throw new Error('No encontramos tu sesión anónima.');
        }

        try {
            await confirmarMesaAnonima(clienteAnonimoId.current, payload.mesaId);
            mesaConfirmada.current = true;
            router.replace({ pathname: '/cliente/menu', params: { mesaId: payload.mesaId, clienteAnonimoId: clienteAnonimoId.current } });
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'No se pudo confirmar la mesa. Intentá de nuevo.');
        }
    };

    return (
        <View className="flex-1 bg-chido-fondo items-center justify-center px-6">
            <Stack.Screen options={{ headerShown: false }} />

            <Text className="text-chido-texto-sobre-oscuro text-3xl font-bold mb-3 text-center">
                Escanear QR de tu mesa
            </Text>
            <Text className="text-chido-texto-secundario-alternativo text-xl text-center mb-10">
                Buscá el código QR que está en la mesa que te asignaron.
            </Text>

            <TouchableOpacity
                onPress={abrirScanner}
                className="bg-chido-cabecera w-full px-8 py-6 rounded-2xl flex-row items-center justify-center"
            >
                <Ionicons name="qr-code-outline" size={28} color={colores.textoSobreOscuro} />
                <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl ml-2">Escanear código QR</Text>
            </TouchableOpacity>

            {mensaje !== '' && (
                <Text className="text-chido-notificacion text-lg text-center mt-6 px-6 font-semibold">
                    {mensaje}
                </Text>
            )}

            <QRScanner visible={escaneando} proposito="mesa" onScan={confirmarMesa} onClose={cerrarScanner} />
        </View>
    )
}
