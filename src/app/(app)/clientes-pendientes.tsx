import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSession } from '../../contexts/AppSessionContext';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { listarPendientes, resolverCliente, TAMANO_PAGINA, type ClientePendiente } from '../../services/aprobacion-cliente.service';

export default function ClientesPendientes() {
  const { mode, role, cargando: sesionCargando } = useAppSession();
  const router = useRouter();
  const permitido = mode === 'authenticated' && (role === 'dueño' || role === 'supervisor');
  const [clientes, setClientes] = useState<ClientePendiente[]>([]);
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const activa = useRef(false);
  const ocupado = useRef(false);
  const revision = useRef(0);

  const cargar = useCallback(async (numero: number) => {
    const actual = ++revision.current;
    setCargando(true);
    try {
      const resultado = await listarPendientes(numero);
      if (!activa.current || revision.current !== actual) return;
      if (!resultado.clientes.length && numero > 0) { setPagina(numero - 1); return; }
      setClientes(resultado.clientes);
      setTotal(resultado.total);
    } catch (error) {
      if (activa.current && revision.current === actual) {
        setClientes([]);
        setMensaje(error instanceof Error ? error.message : 'Error al cargar las solicitudes.');
        Vibration.vibrate(180);
      }
    } finally { if (activa.current && revision.current === actual) setCargando(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    activa.current = true;
    if (permitido) void cargar(pagina);
    return () => { activa.current = false; revision.current++; };
  }, [cargar, pagina, permitido]));

  async function resolver(id: string, estado: 'aceptado' | 'rechazado') {
    if (ocupado.current || cargando) return;
    ocupado.current = true;
    setCargando(true);
    setMensaje('');
    try {
      await resolverCliente(id, estado);
      if (activa.current) setMensaje(`Registro ${estado}. El aviso al cliente quedó programado por correo.`);
    } catch (error) {
      if (activa.current) { setMensaje(error instanceof Error ? error.message : 'No se pudo resolver la solicitud.'); Vibration.vibrate(180); }
    } finally {
      if (activa.current) await cargar(pagina);
      ocupado.current = false;
    }
  }

  if (sesionCargando) return <ChidoLoader mensaje="Verificando sesión…" />;
  if (!permitido) return <Redirect href="/(app)/home" />;
  return <SafeAreaView className="flex-1 bg-orange-700">
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text className="text-white text-3xl font-bold mb-5">Clientes pendientes</Text>
      {!!mensaje && <Text className="text-yellow-100 text-lg mb-4" accessibilityLiveRegion="polite">{mensaje}</Text>}
      {cargando ? <ChidoLoader mensaje="Procesando solicitudes…" /> : <>
        {!clientes.length && <Text className="text-white text-xl my-5">No hay solicitudes para mostrar.</Text>}
        {clientes.map(cliente => <View key={cliente.id} className="bg-orange-800 rounded-2xl p-4 mb-5">
          <View className="h-56 items-center justify-center rounded-xl overflow-hidden mb-4">
            {cliente.fotoUrl ? <Image source={{ uri: cliente.fotoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel={`Foto de ${cliente.nombres}`} onError={() => setClientes(actual => actual.map(c => c.id === cliente.id ? { ...c, fotoUrl: null } : c))} /> : <Text className="text-yellow-100 text-center">No se pudo cargar la foto. Actualizá la lista para reintentar.</Text>}
          </View>
          <Text className="text-white text-2xl font-bold">{cliente.nombres} {cliente.apellidos}</Text>
          <Text className="text-white text-lg mt-2">DNI: {cliente.dni}</Text>
          <Text className="text-white text-lg mt-2">{cliente.correo}</Text>
          <View className="flex-row gap-3 mt-5">
            <Pressable accessibilityRole="button" onPress={() => void resolver(cliente.id, 'aceptado')} className="flex-1 bg-green-800 p-4 rounded-xl"><Text className="text-white text-lg font-bold text-center">Aceptar</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => void resolver(cliente.id, 'rechazado')} className="flex-1 bg-red-700 p-4 rounded-xl"><Text className="text-white text-lg font-bold text-center">Rechazar</Text></Pressable>
          </View>
        </View>)}
        <View className="flex-row justify-between my-4">
          {pagina > 0 && <Pressable accessibilityRole="button" onPress={() => setPagina(p => p - 1)}><Text className="text-white text-lg underline">Anterior</Text></Pressable>}
          {(pagina + 1) * TAMANO_PAGINA < total && <Pressable accessibilityRole="button" onPress={() => setPagina(p => p + 1)}><Text className="text-white text-lg underline">Siguiente</Text></Pressable>}
        </View>
        <Pressable accessibilityRole="button" onPress={() => { setMensaje(''); void cargar(pagina); }} className="bg-orange-800 rounded-xl p-4"><Text className="text-white text-lg text-center">Actualizar lista</Text></Pressable>
      </>}
      <Pressable accessibilityRole="button" disabled={cargando} onPress={() => router.replace('/(app)/home')} className="py-5"><Text className="text-white text-lg text-center underline">Volver al inicio</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
