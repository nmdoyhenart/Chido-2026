import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSession } from '../contexts/AppSessionContext';
import { colores } from '../theme/colores';
import { useVibrarError } from '../hooks/useVibrarError';

interface HeaderProps {
  userName: string;
  role: string;
}

export function Header({ userName, role }: HeaderProps) {
    const { cerrarSesion, usuario } = useAppSession();
    const insets = useSafeAreaInsets();

    const [saliendo, setSaliendo] = useState(false);
    const [error, setError] = useState('');
    useVibrarError(error);
    const handleLogout = async () => {
        if (saliendo) return;
        setSaliendo(true);
        try {
        await cerrarSesion();
        router.replace('/(auth)/login');
        } catch {
        setError('No se pudo salir. Intentá nuevamente.');
        } finally { setSaliendo(false); }
    };

    const fotoUrl = usuario?.fotoUrl ?? (usuario?.foto_perfil && /^https:\/\//i.test(usuario.foto_perfil) ? usuario.foto_perfil : null);
    const nombreCompleto = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ');
    const nombreMostrado = userName === 'Cliente' && nombreCompleto ? nombreCompleto : userName;

    return (
        // En iPhone con notch o Dynamic Island el margen fijo de 56 quedaba corto.
        <View className="bg-chido-cabecera px-5 pb-6 flex-row items-center justify-between" style={{ paddingTop: Math.max(insets.top + 8, 56) }}>
        {/* Profile Info */}
        <View className="flex-row items-center flex-1">
            <View className="w-16 h-16 rounded-full bg-chido-fondo items-center justify-center border-2 border-chido-acento mr-4 overflow-hidden">
            {fotoUrl ? (
                <Image source={{ uri: fotoUrl }} className="w-full h-full" />
            ) : (
                <Ionicons name="person" size={32} color={colores.textoSobreOscuro} />
            )}
            </View>
            <View className="flex-1">
            <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl" numberOfLines={1}>{nombreMostrado}</Text>
            {!!error && <Text accessibilityRole="alert" className="text-chido-texto-sobre-oscuro text-sm">{error}</Text>}
            <View className="bg-chido-acento px-3 py-1 rounded-full flex-row items-center self-start mt-2">
                <View className="w-2.5 h-2.5 rounded-full bg-chido-activo mr-1.5" />
                <Text className="text-chido-texto-sobre-oscuro text-sm font-medium">{role}</Text>
            </View>
            </View>
        </View>

        {/* Actions */}
        <View className="flex-row items-center gap-3">
            <TouchableOpacity
            className="w-14 h-14 rounded-full bg-chido-acento items-center justify-center"
            disabled={saliendo}
            accessibilityLabel="Cerrar sesión"
            onPress={handleLogout}
            >
            <Ionicons name="log-out-outline" size={26} color={colores.textoSobreOscuro} />
            </TouchableOpacity>
        </View>
        </View>
    );
}
