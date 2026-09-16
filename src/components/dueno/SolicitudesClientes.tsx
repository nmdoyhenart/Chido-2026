import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  AppState, FlatList, Modal, ScrollView, StyleSheet, Text,
  TouchableOpacity, Vibration, View,
} from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppSession } from '../../contexts/AppSessionContext';
import ChidoLoader from '../ui/ChidoLoader';
import { listarPendientes, resolverCliente, type ClientePendiente } from '../../services/aprobacion-cliente.service';
import { colores } from '../../theme/colores';
import { SolicitudClienteCard, ConfirmacionCliente } from './SolicitudClienteCard';

import { clientesDemostracion } from '../../data/demostracion';
import { useRestriccionSimulacion } from '../ui/RestriccionSimulacion';

type Decision = { cliente: ClientePendiente; estado: 'aceptado' | 'rechazado' };

export default function SolicitudesClientes() {
  const { mode, role, cargando: sesionCargando } = useAppSession();
  const router = useRouter();
  const { bloquear, modal } = useRestriccionSimulacion();
  const permitido = (mode === 'authenticated' || mode === 'simulation') && (role === 'dueño' || role === 'supervisor');
  const [tarjetas, setTarjetas] = useState<Record<number, ClientePendiente>>({});
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const [altura, setAltura] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const activa = useRef(false);
  const ocupado = useRef(false);
  const modalAbierto = useRef(false);
  const consultas = useRef(0);
  const revision = useRef(0);
  const lista = useRef<FlatList<number>>(null);
  const paginas = useMemo(() => Array.from({ length: total }, (_, i) => i), [total]);

  const cargar = useCallback(async (numero: number, silenciosa = false) => {
    if (mode === 'simulation') {
      setTarjetas(Object.fromEntries(clientesDemostracion.map((cliente, i) => [i, cliente])));
      setTotal(clientesDemostracion.length);
      setCargando(false);
      return;
    }
    const actual = ++revision.current;
    consultas.current++;
    if (!silenciosa) setCargando(true);
    try {
      const resultado = await listarPendientes(numero);
      if (!activa.current || revision.current !== actual) return;
      setTotal(resultado.total);
      if (!resultado.clientes.length && numero > 0) {
        setTarjetas({});
        setPagina(Math.max(0, resultado.total - 1));
        return;
      }
      const cliente = resultado.clientes[0];
      setTarjetas(cliente ? { [numero]: cliente } : {});
      setError('');
      if (!ocupado.current) setCargando(false);

      // Anticipa la tarjeta anterior y la siguiente para que el deslizamiento sea fluido.
      // Las posiciones se renuevan juntas: una aprobación puede desplazar la lista.
      const vecinas = [numero - 1, numero + 1].filter(i => i >= 0 && i < resultado.total);
      await Promise.all(vecinas.map(async indice => {
        try {
          const vecina = await listarPendientes(indice);
          if (activa.current && revision.current === actual && vecina.clientes[0]) {
            setTarjetas(previas => ({ ...previas, [indice]: vecina.clientes[0] }));
          }
        } catch { /* Si falla la anticipación, se vuelve a consultar al mostrar esa tarjeta. */ }
      }));
    } catch (fallo) {
      if (activa.current && revision.current === actual) {
        setError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar las solicitudes.');
        if (!silenciosa) Vibration.vibrate(180);
      }
    } finally {
      consultas.current--;
      if (activa.current && revision.current === actual) setCargando(false);
    }
  }, [mode]);

  useFocusEffect(useCallback(() => {
    activa.current = true;
    if (permitido) void cargar(pagina);
    const refrescar = () => {
      if (permitido && !ocupado.current && !consultas.current && !modalAbierto.current && AppState.currentState !== 'background') {
        void cargar(pagina, true);
      }
    };
    const intervalo = setInterval(refrescar, 15000);
    const cambios = AppState.addEventListener('change', estado => { if (estado === 'active') refrescar(); });
    return () => { activa.current = false; revision.current++; clearInterval(intervalo); cambios.remove(); };
  }, [cargar, pagina, permitido]));

  // Conserva una tarjeta completa al rotar, cambiar el tamaño de letra o mostrar un aviso.
  useEffect(() => {
    if (altura > 0 && total > 0) lista.current?.scrollToOffset({ offset: Math.min(pagina, total - 1) * altura, animated: false });
  }, [altura, pagina, total]);

  function cambiarPagina(numero: number) {
    if (numero < 0 || numero >= total || numero === pagina || ocupado.current) return;
    setMensaje('');
    setError('');
    setCargando(true);
    setPagina(numero);
  }

  function elegirDecision(elegida: Decision | null) {
    if (elegida && bloquear(elegida.estado === 'aceptado' ? 'aceptar clientes' : 'rechazar clientes')) return;
    modalAbierto.current = elegida !== null;
    setDecision(elegida);
  }

  async function confirmar() {
    if (!decision || ocupado.current || cargando) return;
    if (bloquear(decision.estado === 'aceptado' ? 'aceptar clientes' : 'rechazar clientes') || mode !== 'authenticated') return;
    const elegida = decision;
    ocupado.current = true;
    revision.current++;
    elegirDecision(null);
    setCargando(true);
    setMensaje('');
    setError('');
    let falloDecision = '';
    try {
      await resolverCliente(elegida.cliente.id, elegida.estado);
      if (activa.current) setMensaje(elegida.estado === 'aceptado'
        ? 'Cliente aceptado. Ya puede ingresar a Chido.'
        : 'Solicitud rechazada. El cliente no podrá ingresar.');
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

  return <SafeAreaView style={styles.pantalla}>
    <StatusBar style="light" />
    {modal}
    <View style={styles.cabecera}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio" disabled={cargando}
        onPress={() => router.replace('/(app)/home')} style={styles.botonIcono} activeOpacity={0.75}>
        <Feather name="arrow-left" size={23} color={colores.textoSobreOscuro} />
      </TouchableOpacity>
      <View style={styles.titulos}>
        <Text accessibilityRole="header" style={styles.titulo}>Solicitudes</Text>
        <Text style={styles.subtitulo}>{mode === 'simulation' ? 'Simulación · ' : ''}{total} {total === 1 ? 'cliente pendiente' : 'clientes pendientes'}</Text>
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Actualizar solicitudes" disabled={cargando}
        onPress={() => { setMensaje(''); void cargar(pagina); }} style={styles.botonIcono} activeOpacity={0.75}>
        <Feather name="refresh-cw" size={21} color={colores.textoSobreOscuro} />
      </TouchableOpacity>
    </View>

    {!!(mensaje || error) && <View style={[styles.aviso, error ? styles.avisoError : styles.avisoExito]}>
      <Text style={styles.textoAviso} accessibilityLiveRegion={error ? 'assertive' : 'polite'}>{error || mensaje}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar mensaje"
        onPress={() => { setMensaje(''); setError(''); }} style={styles.cerrarAviso}>
        <Feather name="x" size={22} color={colores.textoSobreClaro} />
      </TouchableOpacity>
    </View>}

    <View style={styles.areaLista} onLayout={event => setAltura(Math.round(event.nativeEvent.layout.height))}>
      {total > 0 && altura > 0 ? <FlatList
        ref={lista}
        data={paginas}
        keyExtractor={indice => String(indice)}
        style={styles.lista}
        pagingEnabled
        snapToInterval={altura}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!cargando && !decision}
        getItemLayout={(_, index) => ({ length: altura, offset: altura * index, index })}
        initialNumToRender={3}
        windowSize={3}
        extraData={{ tarjetas, altura, cargando }}
        onMomentumScrollEnd={event => cambiarPagina(Math.round(event.nativeEvent.contentOffset.y / altura))}
        renderItem={({ item: indice }) => <View style={[styles.pagina, { height: altura }]}>
          {tarjetas[indice] ? <SolicitudClienteCard
            cliente={tarjetas[indice]}
            altura={altura}
            deshabilitada={cargando}
            onAceptar={() => elegirDecision({ cliente: tarjetas[indice], estado: 'aceptado' })}
            onRechazar={() => elegirDecision({ cliente: tarjetas[indice], estado: 'rechazado' })}
            onErrorFoto={() => setTarjetas(previas => previas[indice]
              ? { ...previas, [indice]: { ...previas[indice], fotoUrl: null } } : previas)}
          /> : <View style={styles.centro}>
            {cargando ? <ChidoLoader mensaje="Cargando solicitud…" /> : <>
              <Feather name="wifi-off" size={34} color={colores.textoSobreOscuro} />
              <Text style={styles.textoVacio}>No pudimos cargar esta solicitud.</Text>
              <TouchableOpacity style={styles.reintentar} onPress={() => void cargar(pagina)} accessibilityRole="button">
                <Text style={styles.textoNavegacion}>Reintentar</Text>
              </TouchableOpacity>
            </>}
          </View>}
        </View>}
      /> : <View style={styles.centro}>
        {cargando ? <ChidoLoader mensaje="Consultando solicitudes…" /> : <>
          <Feather name={error ? 'wifi-off' : 'check-circle'} size={52} color={colores.textoSobreOscuro} />
          <Text style={styles.textoVacio}>{error ? 'No se pudo actualizar la lista.' : 'Estás al día'}</Text>
          <Text style={styles.ayudaVacio}>{error ? 'Tocá actualizar para volver a intentarlo.' : 'Las nuevas solicitudes aparecerán acá.'}</Text>
        </>}
      </View>}
      {cargando && !!tarjetas[pagina] && <View style={styles.procesando} pointerEvents="auto"><ChidoLoader mensaje="Actualizando…" /></View>}
    </View>

    {total > 0 && <View style={styles.pie}>
      <View style={styles.indicador}>
        <Text style={styles.contador} accessibilityLiveRegion="polite">Solicitud {Math.min(pagina + 1, total)} de {total}</Text>
        <View style={styles.pista}><Feather name="chevrons-down" size={16} color={colores.textoSecundarioSobreOscuro} /><Text style={styles.textoPista}>Deslizá para revisar</Text></View>
      </View>
      <View style={styles.navegacion}>
        <TouchableOpacity disabled={cargando || pagina === 0} accessibilityRole="button" accessibilityState={{ disabled: cargando || pagina === 0 }}
          onPress={() => cambiarPagina(pagina - 1)} activeOpacity={0.75} style={[styles.botonNavegacion, (cargando || pagina === 0) && styles.deshabilitado]}>
          <Feather name="chevron-left" size={20} color={colores.textoSobreClaro} /><Text style={styles.textoNavegacion}>Anterior</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={cargando || pagina >= total - 1} accessibilityRole="button" accessibilityState={{ disabled: cargando || pagina >= total - 1 }}
          onPress={() => cambiarPagina(pagina + 1)} activeOpacity={0.75} style={[styles.botonNavegacion, (cargando || pagina >= total - 1) && styles.deshabilitado]}>
          <Text style={styles.textoNavegacion}>Siguiente</Text><Feather name="chevron-right" size={20} color={colores.textoSobreClaro} />
        </TouchableOpacity>
      </View>
    </View>}

    <Modal visible={decision !== null} transparent animationType="fade" onRequestClose={() => elegirDecision(null)}>
      <SafeAreaView style={styles.fondoModal}>
        <ScrollView contentContainerStyle={styles.contenidoModal} bounces={false}>
          {decision && <ConfirmacionCliente cliente={decision.cliente} estado={decision.estado}
            onConfirmar={() => void confirmar()} onCancelar={() => elegirDecision(null)} />}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.cabecera },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  botonIcono: { width: 46, height: 46, borderRadius: 15, backgroundColor: colores.textoBotonOutline, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, minWidth: 0 },
  titulo: { color: colores.textoSobreOscuro, fontSize: 23, fontWeight: '800' },
  subtitulo: { color: colores.textoSecundarioSobreOscuro, fontSize: 14, marginTop: 3 },
  areaLista: { flex: 1, backgroundColor: colores.fondo, overflow: 'hidden' },
  lista: { flex: 1 },
  pagina: { paddingHorizontal: 16, paddingVertical: 10, maxWidth: 620, width: '100%', alignSelf: 'center' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  textoVacio: { color: colores.textoSobreOscuro, fontSize: 23, fontWeight: '800', textAlign: 'center' },
  ayudaVacio: { color: colores.textoSobreOscuro, fontSize: 17, textAlign: 'center' },
  reintentar: { backgroundColor: colores.superficieNaranja, padding: 16, borderRadius: 14 },
  procesando: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(58,31,20,0.90)', justifyContent: 'center', alignItems: 'center' },
  aviso: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, borderBottomWidth: 2 },
  avisoExito: { backgroundColor: colores.superficieNaranja, borderColor: colores.textoBotonOutline },
  avisoError: { backgroundColor: '#fce4d7', borderColor: '#98392f' },
  textoAviso: { flex: 1, color: colores.textoSobreClaro, fontSize: 15, lineHeight: 21, paddingVertical: 10 },
  cerrarAviso: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  pie: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 10 },
  indicador: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between', alignItems: 'center' },
  contador: { color: colores.textoSobreOscuro, fontSize: 14, fontWeight: '700' },
  pista: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  textoPista: { color: colores.textoSecundarioSobreOscuro, fontSize: 12 },
  navegacion: { flexDirection: 'row', gap: 12 },
  botonNavegacion: { flex: 1, flexDirection: 'row', gap: 6, minHeight: 48, borderRadius: 14, backgroundColor: colores.superficieNaranja, padding: 10, alignItems: 'center', justifyContent: 'center' },
  textoNavegacion: { color: colores.textoSobreClaro, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  deshabilitado: { opacity: 0.45 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(42,20,12,0.82)' },
  contenidoModal: { flexGrow: 1, justifyContent: 'center', padding: 22 },
});
