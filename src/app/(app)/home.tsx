import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import React from 'react';

import { Link, Redirect } from 'expo-router';

import { useAppSession } from '../../contexts/AppSessionContext';
import ChidoLoader from '../../components/ui/ChidoLoader';
import InicioDueno from '../../components/dueno/InicioDueno';

export default function HomeScreen() {
  const router = useRouter();
  const { mode, role, usuario, cerrarSesion } = useAppSession();
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    try { await cerrarSesion(); router.replace('/(auth)/login'); }
    catch { setError('No se pudo cerrar la sesión. Revisá la conexión e intentá nuevamente.'); Vibration.vibrate(180); }
    finally { setSaliendo(false); }
  }
  if ((role === 'dueño' || role === 'supervisor') && (mode === 'simulation' || (mode === 'authenticated' && usuario))) {
    return <InicioDueno key={usuario?.id ?? role} simulacion={mode === 'simulation'} usuario={usuario ?? { nombres: role === 'dueño' ? 'Dueño de demostración' : 'Supervisor de demostración', apellidos: '', foto_perfil: '', perfil: role }} saliendo={saliendo} error={error} onSalir={salir} onPendientes={() => router.push('/(app)/clientes-pendientes')} />;
  }
  
  if (role === 'cliente registrado' || role === 'cliente anónimo') {
    return <Redirect href="/cliente/home" />;
  }

  return <SafeAreaView className="flex-1 bg-chido-fondo">
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
      <Image source={require('../../../assets/images/logo.png')} style={{ width: 180, height: 180, alignSelf: 'center' }} resizeMode="contain" />
      <Text className="text-chido-texto-sobre-oscuro text-4xl font-extrabold text-center mt-5">Bienvenido a Chido</Text>
      <Text className="text-chido-texto-sobre-oscuro text-xl text-center mt-5">{usuario?.nombres ?? (mode === 'simulation' ? 'Vista de demostración' : 'Ingreso como invitado')}</Text>
      <Text className="text-chido-texto-secundario-sobre-oscuro text-xl text-center mt-3 capitalize">{role}</Text>
      {mode === 'authenticated' && role === 'metre' && <Pressable onPress={() => router.push('/(auth)/registro')} disabled={saliendo} className="bg-chido-cabecera rounded-xl p-5 mt-8" accessibilityRole="button"><Text className="text-chido-texto-sobre-oscuro text-xl font-bold text-center">Registrar cliente</Text></Pressable>}
      {mode === 'authenticated' && (role === 'dueño' || role === 'supervisor') && <Pressable onPress={() => router.push('/(app)/clientes-pendientes')} disabled={saliendo} className="bg-chido-cabecera rounded-xl p-5 mt-5" accessibilityRole="button"><Text className="text-chido-texto-sobre-oscuro text-xl font-bold text-center">Clientes pendientes</Text></Pressable>}
      {mode === 'authenticated' && role === 'mozo' && (
        <>
          <Pressable onPress={() => router.push('/mozo/chats')} disabled={saliendo} className="bg-chido-cabecera rounded-xl p-5 mt-5" accessibilityRole="button">
            <Text className="text-chido-texto-sobre-oscuro text-xl font-bold text-center">Consultas de Mesas</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/mozo/pedidos')} disabled={saliendo} className="bg-chido-cabecera rounded-xl p-5 mt-5" accessibilityRole="button">
            <Text className="text-chido-texto-sobre-oscuro text-xl font-bold text-center">Gestión de Pedidos</Text>
          </Pressable>
        </>
      )}
      {error && <Text className="text-chido-notificacion text-lg text-center mt-5" accessibilityLiveRegion="assertive">{error}</Text>}
      {saliendo ? <ChidoLoader mensaje="Cerrando sesión…" /> : <Pressable onPress={salir} className="bg-chido-cabecera rounded-xl p-5 mt-8" accessibilityRole="button"><Text className="text-chido-texto-sobre-oscuro text-xl font-bold text-center">Cerrar sesión</Text></Pressable>}
    </ScrollView>
  </SafeAreaView>;
}
