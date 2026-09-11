import { useCallback, useRef, useState } from 'react';
import { AppState, Image, Modal, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSession } from '../../contexts/AppSessionContext';
import ChidoLoader from '../ui/ChidoLoader';
import { listarPendientes, resolverCliente, TAMANO_PAGINA, type ClientePendiente } from '../../services/aprobacion-cliente.service';

type Decision = { cliente: ClientePendiente; estado: 'aceptado' | 'rechazado' };

export default function SolicitudesClientes() {
  const { mode, role, cargando: sesionCargando } = useAppSession();
  const router = useRouter();
  const permitido = mode === 'authenticated' && (role === 'dueño' || role === 'supervisor');
  const [clientes, setClientes] = useState<ClientePendiente[]>([]);
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const activa = useRef(false);
  const ocupado = useRef(false);
  const consultas = useRef(0);
  const revision = useRef(0);

  const cargar = useCallback(async (numero: number, silenciosa = false) => {
    const actual = ++revision.current;
    consultas.current++;
    if (!silenciosa) setCargando(true);
    try {
      const resultado = await listarPendientes(numero);
      if (!activa.current || revision.current !== actual) return;
      if (!resultado.clientes.length && numero > 0) {
        setPagina(Math.max(0, Math.ceil(resultado.total / TAMANO_PAGINA) - 1));
        return;
      }
      setClientes(resultado.clientes);
      setTotal(resultado.total);
      setError('');
    } catch (fallo) {
      if (activa.current && revision.current === actual) {
        setError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar las solicitudes.');
        if (!silenciosa) Vibration.vibrate(180);
      }
    } finally {
      consultas.current--;
      if (activa.current && revision.current === actual && !silenciosa) setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    activa.current = true;
    if (permitido) void cargar(pagina);
    const refrescar = () => {
      if (permitido && !ocupado.current && !consultas.current && AppState.currentState !== 'background') void cargar(pagina, true);
    };
    const intervalo = setInterval(refrescar, 10000);
    const cambios = AppState.addEventListener('change', estado => { if (estado === 'active') refrescar(); });
    return () => { activa.current = false; revision.current++; clearInterval(intervalo); cambios.remove(); };
  }, [cargar, pagina, permitido]));

  async function confirmar() {
    if (!decision || ocupado.current || cargando) return;
    const elegida = decision;
    ocupado.current = true;
    revision.current++;
    setDecision(null);
    setCargando(true);
    setMensaje('');
    setError('');
    let falloDecision = '';
    try {
      await resolverCliente(elegida.cliente.id, elegida.estado);
      if (activa.current) setMensaje(elegida.estado === 'aceptado'
        ? 'Cliente aceptado. Ya puede ingresar con su correo y contraseña.'
        : 'Solicitud rechazada. El cliente no podrá ingresar con esta cuenta.');
    } catch (fallo) {
      falloDecision = fallo instanceof Error ? fallo.message : 'No se pudo confirmar la decisión. Actualizá la lista.';
      Vibration.vibrate(180);
    } finally {
      if (activa.current) {
        await cargar(pagina);
        if (activa.current && falloDecision) setError(falloDecision);
      }
      ocupado.current = false;
    }
  }

  if (sesionCargando) return <ChidoLoader mensaje="Verificando sesión…" />;
  if (!permitido) return <Redirect href="/(app)/home" />;
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#CC7135' }}>
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/(app)/home')} disabled={ocupado.current} className="py-3 mb-3">
        <Text className="text-white text-lg font-bold">‹ Volver al inicio</Text>
      </Pressable>
      <Text className="text-white text-3xl font-bold mb-2">Clientes pendientes</Text>
      {!cargando && <Text className="text-orange-100 text-lg mb-5">{total} solicitudes pendientes</Text>}
      {!!mensaje && <View className="bg-green-800 rounded-xl p-4 mb-4"><Text className="text-white text-lg" accessibilityLiveRegion="polite">{mensaje}</Text></View>}
      {!!error && <View className="bg-red-800 rounded-xl p-4 mb-4"><Text className="text-white text-lg" accessibilityLiveRegion="assertive">{error}</Text></View>}
      {cargando ? <ChidoLoader mensaje="Procesando solicitudes…" /> : <>
        {!clientes.length && !error && <Text className="text-white text-xl my-8 text-center">No hay clientes pendientes de aprobación.</Text>}
        {clientes.map(cliente => <View key={cliente.id} style={{ backgroundColor: '#A85B2E', borderColor: '#C58C5B', borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 22 }}>
          <View style={{ height: 240, backgroundColor: '#8C3E22', borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            {cliente.fotoUrl ? <Image source={{ uri: cliente.fotoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel={'Foto de ' + cliente.nombres + ' ' + (cliente.apellidos ?? '')} onError={() => setClientes(actual => actual.map(c => c.id === cliente.id ? { ...c, fotoUrl: null } : c))} /> : <Text className="text-orange-100 text-center text-lg px-4">No se pudo cargar la foto. Tocá «Actualizar lista» para reintentar.</Text>}
          </View>
          <Text className="text-orange-100 text-base">Apellidos</Text>
          <Text className="text-white text-2xl font-bold mb-3">{cliente.apellidos || 'Sin apellido registrado'}</Text>
          <Text className="text-orange-100 text-base">Nombres</Text>
          <Text className="text-white text-2xl font-bold mb-3">{cliente.nombres}</Text>
          <Text className="text-orange-100 text-lg">DNI: {cliente.dni}</Text>
          <Text className="text-orange-100 text-lg mt-2">{cliente.correo}</Text>
          <View style={styles.acciones}>
            <Pressable accessibilityRole="button" accessibilityLabel={'Aceptar a ' + cliente.nombres} onPress={() => setDecision({ cliente, estado: 'aceptado' })} style={({ pressed }) => [styles.boton, styles.botonEnFila, styles.aceptar, pressed && styles.presionado]}><Text style={styles.textoBoton}>Aceptar</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={'Rechazar a ' + cliente.nombres} onPress={() => setDecision({ cliente, estado: 'rechazado' })} style={({ pressed }) => [styles.boton, styles.botonEnFila, styles.rechazar, pressed && styles.presionado]}><Text style={styles.textoBoton}>Rechazar</Text></Pressable>
          </View>
        </View>)}
        <View className="flex-row justify-between items-center my-4">
          <Pressable disabled={pagina === 0} accessibilityRole="button" onPress={() => setPagina(p => p - 1)} style={{ opacity: pagina === 0 ? 0.45 : 1 }} className="py-3"><Text className="text-white text-lg">Anterior</Text></Pressable>
          <Text className="text-orange-100">Página {pagina + 1}</Text>
          <Pressable disabled={(pagina + 1) * TAMANO_PAGINA >= total} accessibilityRole="button" onPress={() => setPagina(p => p + 1)} style={{ opacity: (pagina + 1) * TAMANO_PAGINA >= total ? 0.45 : 1 }} className="py-3"><Text className="text-white text-lg">Siguiente</Text></Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => { setMensaje(''); void cargar(pagina); }} style={{ backgroundColor: '#8C3E22', padding: 18, borderRadius: 14 }}><Text className="text-white text-lg text-center font-bold">Actualizar lista</Text></Pressable>
      </>}
    </ScrollView>
    <Modal visible={decision !== null} transparent animationType="fade" onRequestClose={() => setDecision(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(67,20,7,0.75)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#8C3E22', padding: 24, borderRadius: 24, maxWidth: 440, width: '100%', alignSelf: 'center' }} accessibilityViewIsModal>
          <Text className="text-white text-2xl font-bold mb-4">{decision?.estado === 'aceptado' ? 'Aceptar cliente' : 'Rechazar solicitud'}</Text>
          <Text className="text-orange-100 text-xl mb-4">{decision?.cliente.nombres} {decision?.cliente.apellidos}</Text>
          <Text className="text-white text-lg mb-5">{decision?.estado === 'aceptado' ? 'Podrá ingresar a Chido con su correo y contraseña.' : 'La solicitud saldrá del listado y el cliente no podrá ingresar. Sus datos se conservarán con estado rechazado.'}</Text>
          <Pressable accessibilityRole="button" onPress={() => void confirmar()} style={({ pressed }) => [styles.boton, decision?.estado === 'aceptado' ? styles.aceptar : styles.rechazar, pressed && styles.presionado]}><Text style={styles.textoBoton}>{decision?.estado === 'aceptado' ? 'Confirmar aceptación' : 'Confirmar rechazo'}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setDecision(null)} className="pt-5 pb-2"><Text className="text-white text-lg text-center underline">Cancelar</Text></Pressable>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  boton: { minHeight: 56, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  botonEnFila: { flexGrow: 1, flexBasis: 120, minWidth: 120 },
  aceptar: { backgroundColor: '#166534' },
  rechazar: { backgroundColor: '#991B1B' },
  presionado: { opacity: 0.8 },
  textoBoton: { color: '#FFFFFF', fontSize: 18, lineHeight: 24, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
});
