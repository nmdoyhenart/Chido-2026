import { useCallback, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSession } from '../../contexts/AppSessionContext';
import { colores as c } from '../../theme/colores';
import ChidoLoader from '../ui/ChidoLoader';
import { cartaPrueba, consultasPrueba, pedidosPrueba } from './datosPrueba';
import { supabase } from '../../lib/supabase';

type Vista = 'inicio' | 'consultas' | 'chat' | 'pedidos' | 'carta';
const titulos = { inicio: '', consultas: 'Consultas al mozo', chat: '', pedidos: 'Pedidos entrantes', carta: 'Carta general' };

export default function PantallaMozo({ vista = 'inicio', mesa = '5' }: { vista?: Vista; mesa?: string }) {
  const router = useRouter();
  const { mode, role, usuario, cargando, cerrarSesion } = useAppSession();
  const { width, fontScale } = useWindowDimensions();
  const compacto = width < 370 || fontScale > 1.2;
  const [pagina, setPagina] = useState(0);
  const [borrador, setBorrador] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const salida = useRef(false);
  const simulacion = mode === 'simulation';
  const real = mode === 'authenticated' && role === 'mozo' && !!usuario;
  const nombre = real ? [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ') : 'Mozo';
  const [cartaReal, setCartaReal] = useState<typeof cartaPrueba>([]);
  const [cargandoCarta, setCargandoCarta] = useState(false);
  const [errorCarta, setErrorCarta] = useState<string | null>(null);
  const [revisionCarta, setRevisionCarta] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!real || vista !== 'carta') return;
    let activa = true;
    setCargandoCarta(true);
    setErrorCarta(null);
    void (async () => {
      try {
        const { data, error } = await supabase.from('productos').select('id,nombre,descripcion,precio,tipo').order('nombre');
        if (error) throw error;
        const grupos: typeof cartaPrueba = [];
        for (const producto of data ?? []) {
          const categoria = producto.tipo === 'bebida' ? 'Bebidas' : producto.tipo === 'postre' ? 'Postres' : 'Platos';
          let grupo = grupos.find(g => g.categoria === categoria);
          if (!grupo) { grupo = { categoria, productos: [] }; grupos.push(grupo); }
          grupo.productos.push({ nombre: producto.nombre, descripcion: producto.descripcion, precio: producto.precio });
        }
        if (activa) setCartaReal(grupos);
      } catch {
        if (activa) { setCartaReal([]); setErrorCarta('No se pudo cargar la carta. Intentá nuevamente.'); }
      } finally { if (activa) setCargandoCarta(false); }
    })();
    return () => { activa = false; };
  // El contador permite reintentar una consulta fallida sin salir de la pantalla.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real, vista, revisionCarta]));
  const pedidos = simulacion ? pedidosPrueba : [];
  const consultas = simulacion ? consultasPrueba : [];
  const carta = simulacion ? cartaPrueba : cartaReal;
  const pedido = pedidos[pagina];
  const consulta = consultas.find(item => String(item.mesa) === mesa);
  const noLeidas = consultas.filter(item => item.nueva).length;
  function prueba(accion: string) {
    Keyboard.dismiss();
    if (!simulacion) { setAviso('Esta función todavía no está conectada al servicio real. No se realizó ningún cambio.'); return; }
    setAviso(`Esta es una pantalla de simulación. Para completar la acción de ${accion} debes iniciar sesión con un usuario Mozo.`);
  }
  async function salir() {
    if (salida.current) return;
    salida.current = true; setSaliendo(true);
    try { await cerrarSesion(); router.replace('/(auth)/login'); }
    catch { setAviso('No pudimos cerrar la sesión. Intentá nuevamente.'); }
    finally { salida.current = false; setSaliendo(false); }
  }
  function volver() {
    router.dismissTo(vista === 'chat' ? '/mozo/chats' : '/(app)/home');
  }
  if (cargando) return <ChidoLoader mensaje="Verificando sesión…" />;
  if ((!simulacion && !real) || role !== 'mozo') return <Redirect href="/(app)/home" />;

  return <View style={s.pantalla}>
    <StatusBar style="light" />
    <SafeAreaView edges={['top', 'left', 'right']} style={s.cabecera}>
      {vista === 'chat' ? <View style={s.perfil}>
        <TouchableOpacity style={s.botonIcono} accessibilityRole="button" accessibilityLabel="Volver a consultas" onPress={volver}><Feather name="arrow-left" size={25} color={c.textoSobreOscuro} /></TouchableOpacity>
        <View style={s.avatar}><Feather name="user" size={32} color={c.textoSobreOscuro} /></View>
        <View style={s.textos}><Text style={s.nombre}>{consulta ? `Mesa ${consulta.mesa}` : 'Consulta no disponible'}</Text><Text style={s.secundario}>{simulacion ? 'Chat de prueba' : 'Consultas'}</Text></View>
      </View> : <View style={[s.perfil, compacto && s.perfilCompacto]}>
        <View style={s.avatar}><Feather name="user" size={32} color={c.textoSobreOscuro} /></View>
        <View style={s.textos}><Text style={s.nombre}>{nombre}</Text><View style={s.insignia}><View style={s.puntoVerde} /><Text style={s.textoRol}>Mozo</Text></View></View>
        <View style={[s.acciones, compacto && s.accionesCompactas]}>
          <TouchableOpacity style={s.botonIcono} accessibilityRole="button" accessibilityLabel="Cerrar sesión" disabled={saliendo} onPress={() => void salir()}><Feather name="log-out" size={26} color={c.textoSobreOscuro} /></TouchableOpacity>
        </View>
      </View>}
    </SafeAreaView>
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.cuerpo, vista === 'chat' && s.fondoChat]}>
      <KeyboardAvoidingView style={s.cuerpo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView key={vista} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.contenido, (vista === 'inicio' || vista === 'pedidos') && s.contenidoExpandido]} showsVerticalScrollIndicator={false}>
          {saliendo && <ChidoLoader mensaje="Cerrando sesión…" />}
          {vista === 'inicio' ? <Text style={s.saludo} accessibilityRole="header">Hola, {nombre.split(' ')[0]}</Text> : vista !== 'chat' && <View style={s.tituloFila}>
            <TouchableOpacity style={s.volver} accessibilityRole="button" accessibilityLabel="Volver al inicio del mozo" onPress={volver}><Feather name="arrow-left" size={23} color={c.textoSobreOscuro} /></TouchableOpacity>
            <Text style={s.titulo} accessibilityRole="header">{titulos[vista]}</Text>
          </View>}
          {simulacion && <Text style={s.nota}>Modo simulación · Acceso rápido</Text>}

          {vista === 'inicio' && <>
            {([
              { texto: 'Consultas al mozo', icono: 'message-circle', cantidad: simulacion ? noLeidas : null, ruta: '/mozo/chats' },
              { texto: 'Pedidos entrantes', icono: 'shopping-bag', cantidad: simulacion ? pedidos.length : null, ruta: '/mozo/pedidos' },
            ] as const).map(item => <TouchableOpacity key={item.ruta} style={[s.card, s.acceso]} activeOpacity={0.8} accessibilityRole="button" onPress={() => router.push(item.ruta as any)}>
              <View style={[s.iconoAcceso, compacto && s.iconoCompacto]}><Feather name={item.icono} size={compacto ? 36 : 44} color={c.textoSobreOscuro} /></View>
              <Text style={[s.tituloCard, s.tituloAcceso, s.textos]}>{item.texto}</Text>
              {item.cantidad !== null ? <View style={s.contador}><Text style={s.textoContador}>{item.cantidad}</Text></View> : <Feather name="chevron-right" size={30} color={c.textoSecundarioSobreOscuro} />}
            </TouchableOpacity>)}
          </>}

          {vista === 'consultas' && consultas.map(item => <TouchableOpacity key={item.mesa} style={[s.card, s.consulta]} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Consulta de la mesa ${item.mesa}${item.nueva ? ', sin leer' : ''}`} onPress={() => router.push({ pathname: '/mozo/chat-mesa', params: { mesa: String(item.mesa) } })}>
            <View style={s.iconoConsulta}><Feather name="message-circle" size={27} color={c.textoSobreOscuro} /></View>
            <View style={s.textos}><Text style={s.tituloCard}>Mesa {item.mesa}</Text><Text numberOfLines={1} style={s.secundario}>{item.mensajes[0].texto}</Text></View>
            <View style={s.horaConsulta}><Text style={s.secundario}>{item.hora}</Text>{item.nueva && <View style={s.noLeida} />}</View>
          </TouchableOpacity>)}

          {vista === 'chat' && simulacion && (consulta ? consulta.mensajes.map((mensaje, i) => <View key={i} style={[s.burbuja, mensaje.propio ? s.burbujaPropia : s.burbujaCliente]}>
            <Text style={[s.mensaje, mensaje.propio && s.textoPropio]}>{mensaje.texto}</Text><Text style={[s.hora, mensaje.propio && s.horaPropia]}>{mensaje.hora}</Text>
          </View>) : <Text style={s.secundario}>Volvé a la lista y elegí una de las mesas de ejemplo.</Text>)}

          {vista === 'pedidos' && pedido && <>
            <Text style={s.indicador} accessibilityLiveRegion="polite">PEDIDO {pagina + 1} DE {pedidos.length}</Text>
            <View style={[s.card, s.pedido]}>
              <Text style={s.mesaPedido}>Mesa {pedido.mesa}</Text>
              {pedido.items.map(item => <View style={s.itemPedido} key={item.nombre}><Text style={[s.tituloCard, s.textos]}>{item.nombre}</Text><Text style={s.tituloCard}>{item.cantidad}x</Text></View>)}
              <View style={s.rellenoPedido} />
              <Text style={s.antiguedad}>Hace {pedido.minutos} min</Text>
              <View style={[s.filaBotones, compacto && s.botonesColumna]}>
                <TouchableOpacity style={[s.boton, s.rechazar]} accessibilityRole="button" onPress={() => prueba('rechazar pedidos')}><Text style={s.textoBoton}>Rechazar</Text></TouchableOpacity>
                <TouchableOpacity style={s.boton} accessibilityRole="button" onPress={() => prueba('confirmar pedidos')}><Text style={s.textoBoton}>Confirmar</Text></TouchableOpacity>
              </View>
            </View>
            <View style={[s.filaBotones, compacto && s.botonesColumna]}>
              <TouchableOpacity disabled={pagina === 0} accessibilityRole="button" accessibilityState={{ disabled: pagina === 0 }} style={[s.navegar, pagina === 0 && s.deshabilitado]} onPress={() => setPagina(p => p - 1)}><Text style={s.textoBoton}>← Anterior</Text></TouchableOpacity>
              <TouchableOpacity disabled={pagina === pedidos.length - 1} accessibilityRole="button" accessibilityState={{ disabled: pagina === pedidos.length - 1 }} style={[s.navegar, pagina === pedidos.length - 1 && s.deshabilitado]} onPress={() => setPagina(p => p + 1)}><Text style={s.textoBoton}>Siguiente →</Text></TouchableOpacity>
            </View>
          </>}

          {!simulacion && (vista === 'consultas' || vista === 'chat' || vista === 'pedidos') && <View style={[s.card, { padding: 24 }]}><Text style={s.tituloCard}>{vista === 'pedidos' ? 'Pedidos' : 'Consultas'}</Text><Text style={s.secundario}>La cuenta está autenticada. Esta sección todavía no está conectada a datos reales.</Text></View>}
          {vista === 'carta' && cargandoCarta && <ChidoLoader mensaje="Cargando carta…" />}
          {vista === 'carta' && errorCarta && <TouchableOpacity accessibilityRole="button" style={s.boton} onPress={() => setRevisionCarta(v => v + 1)}><Text style={s.textoBoton}>{errorCarta} Reintentar</Text></TouchableOpacity>}
          {vista === 'carta' && !simulacion && !cargandoCarta && !errorCarta && carta.length === 0 && <Text style={s.secundario}>No hay productos registrados en la carta.</Text>}
          {vista === 'carta' && carta.map(grupo => <View key={grupo.categoria} style={s.grupoCarta}>
            <Text style={s.categoria} accessibilityRole="header">{grupo.categoria}</Text>
            {grupo.productos.map(producto => <View key={producto.nombre} style={[s.card, s.producto, compacto && s.productoCompacto]}>
              <View style={s.imagenProducto} accessible={false}><Text style={s.emoji}>🌮</Text></View>
              <View style={s.textos}><Text style={s.nombreProducto}>{producto.nombre}</Text><Text style={s.detalleProducto}>{producto.descripcion}</Text><Text style={s.precio}>${producto.precio}</Text></View>
              {simulacion && <TouchableOpacity style={s.editar} accessibilityRole="button" accessibilityLabel={`Editar ${producto.nombre}, acción de prueba`} onPress={() => prueba('editar productos')}><Feather name="edit" size={22} color={c.textoSobreOscuro} /></TouchableOpacity>}
            </View>)}
          </View>)}
        </ScrollView>
        {vista === 'chat' && consulta && <View style={s.compositor}>
          <TextInput style={s.input} accessibilityLabel="Mensaje de prueba" placeholder="Escribí un mensaje" placeholderTextColor={c.textoSecundarioSobreClaro} value={borrador} onChangeText={setBorrador} multiline maxLength={1000} />
          <TouchableOpacity style={s.enviar} accessibilityRole="button" accessibilityLabel="Enviar mensaje de prueba" onPress={() => prueba('enviar mensajes')}><Feather name="send" size={26} color={c.textoSobreOscuro} /></TouchableOpacity>
        </View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
    <Modal transparent animationType="fade" visible={aviso !== null} onRequestClose={() => setAviso(null)}>
      <SafeAreaView style={s.fondoModal}><ScrollView contentContainerStyle={s.contenidoModal}>
        <View style={s.modal} accessibilityViewIsModal><Feather name="info" size={30} color={c.textoSobreOscuro} /><Text style={s.tituloCard}>{simulacion ? 'Modo de prueba' : 'Información'}</Text><Text style={s.explicacion}>{aviso}</Text>
          <TouchableOpacity style={[s.boton, s.botonModal]} accessibilityRole="button" onPress={() => setAviso(null)}><Text style={s.textoBoton}>Seguir explorando</Text></TouchableOpacity>
        </View>
      </ScrollView></SafeAreaView>
    </Modal>
  </View>;
}

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.fondo }, cuerpo: { flex: 1 }, cabecera: { backgroundColor: c.cabecera },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingVertical: 24, width: '100%', maxWidth: 760, alignSelf: 'center' },
  perfilCompacto: { flexWrap: 'wrap', paddingVertical: 14 }, textos: { flex: 1, minWidth: 0 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#d49462', backgroundColor: '#a35b40', alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 24, lineHeight: 30, color: c.textoSobreOscuro, fontWeight: '800' },
  insignia: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, marginTop: 8, borderRadius: 20, backgroundColor: '#a35b40' },
  puntoVerde: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.activo }, textoRol: { color: c.textoSecundarioSobreOscuro, fontSize: 15, fontWeight: '700' },
  acciones: { flexDirection: 'row', gap: 8 }, accionesCompactas: { width: '100%', justifyContent: 'flex-end' },
  botonIcono: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#a35b40', alignItems: 'center', justifyContent: 'center' },
  puntoAviso: { position: 'absolute', top: 7, right: 9, width: 10, height: 10, borderRadius: 5, backgroundColor: c.notificacion, borderWidth: 1, borderColor: c.cabecera },
  contenido: { padding: 20, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: 24 }, contenidoExpandido: { flexGrow: 1 },
  saludo: { color: c.textoSobreOscuro, fontFamily: serif, fontSize: 32, fontWeight: '700', marginTop: 6 },
  nota: { fontSize: 12, color: c.textoSobreOscuro, textAlign: 'center' },
  card: { borderWidth: 1, borderColor: '#d49462', borderRadius: 21, backgroundColor: '#a85b2c' },
  acceso: { flex: 1, minHeight: 172, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 20 },
  iconoAcceso: { width: 78, height: 78, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.cabecera }, iconoCompacto: { width: 56, height: 56 },
  tituloCard: { color: c.textoSobreOscuro, fontSize: 21, lineHeight: 28, fontWeight: '800' },
  tituloAcceso: { fontSize: 28, lineHeight: 34 },
  contador: { minWidth: 46, height: 46, borderRadius: 23, backgroundColor: c.notificacion, alignItems: 'center', justifyContent: 'center' }, textoContador: { color: c.textoSobreOscuro, fontSize: 24, fontWeight: '800' },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 3, marginBottom: 4 }, volver: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#a85b2c', alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, color: c.textoSobreOscuro, fontFamily: serif, fontSize: 27, fontWeight: '700', textAlign: 'center' },
  consulta: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, minHeight: 115 }, iconoConsulta: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.cabecera, alignItems: 'center', justifyContent: 'center' },
  secundario: { fontSize: 15, lineHeight: 22, color: c.textoSecundarioSobreOscuro, marginTop: 5 }, horaConsulta: { alignItems: 'flex-end', gap: 9 }, noLeida: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.notificacion },
  indicador: { textAlign: 'center', color: c.textoSecundarioSobreOscuro, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  pedido: { flexGrow: 1, padding: 24, minHeight: 360 }, mesaPedido: { fontFamily: serif, fontSize: 38, color: c.textoSobreOscuro, fontWeight: '700', marginBottom: 14 },
  itemPedido: { flexDirection: 'row', gap: 15, borderBottomWidth: 1, borderBottomColor: '#c88a5a', paddingVertical: 16 }, rellenoPedido: { flex: 1, minHeight: 45 }, antiguedad: { color: c.textoSecundarioSobreOscuro, fontSize: 17, fontWeight: '700', marginBottom: 18 },
  filaBotones: { flexDirection: 'row', gap: 12 }, botonesColumna: { flexDirection: 'column' },
  boton: { flexGrow: 1, flexBasis: 0, backgroundColor: c.cabecera, minHeight: 52, borderRadius: 15, padding: 14, alignItems: 'center', justifyContent: 'center' },
  rechazar: { backgroundColor: c.botonPrincipal, borderWidth: 1, borderColor: c.bordeError }, textoBoton: { color: c.textoSobreOscuro, fontWeight: '800', fontSize: 17, textAlign: 'center' },
  navegar: { flex: 1, padding: 16, minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: '#d49462', backgroundColor: '#a85b2c', alignItems: 'center', justifyContent: 'center' }, deshabilitado: { opacity: 0.45 },
  grupoCarta: { gap: 13 }, categoria: { fontFamily: serif, fontWeight: '700', color: c.textoSobreOscuro, fontSize: 25, marginTop: 7 },
  producto: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, minHeight: 103 }, productoCompacto: { flexWrap: 'wrap' }, imagenProducto: { width: 58, height: 64, borderRadius: 14, backgroundColor: '#b8754d', alignItems: 'center', justifyContent: 'center' }, emoji: { fontSize: 34 },
  nombreProducto: { fontFamily: serif, fontWeight: '700', fontSize: 19, lineHeight: 24, color: c.textoSobreOscuro }, detalleProducto: { color: c.textoSecundarioSobreOscuro, fontSize: 14, lineHeight: 20, marginTop: 3 }, precio: { color: c.textoSobreOscuro, fontWeight: '800', fontSize: 18, marginTop: 5 },
  editar: { width: 44, height: 44, borderRadius: 13, borderWidth: 1, borderColor: '#d49462', backgroundColor: '#8d481f', alignItems: 'center', justifyContent: 'center' },
  fondoChat: { backgroundColor: '#b45e2b' }, burbuja: { maxWidth: '88%', padding: 16, borderRadius: 19, gap: 8, elevation: 2 }, burbujaCliente: { alignSelf: 'flex-start', backgroundColor: c.textoSobreClaro, borderBottomLeftRadius: 4 }, burbujaPropia: { alignSelf: 'flex-end', backgroundColor: c.textoSobreOscuro, borderBottomRightRadius: 4 },
  mensaje: { color: c.textoSobreOscuro, fontSize: 18, lineHeight: 26 }, textoPropio: { color: c.textoSobreClaro }, hora: { color: c.textoSecundarioSobreOscuro, fontSize: 13, textAlign: 'right' }, horaPropia: { color: c.textoSecundarioSobreClaro },
  compositor: { width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 16 }, input: { flex: 1, minHeight: 52, maxHeight: 140, backgroundColor: c.textoSobreOscuro, borderRadius: 26, color: c.textoSobreClaro, paddingHorizontal: 18, paddingVertical: 14, fontSize: 17 }, enviar: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.cabecera, alignItems: 'center', justifyContent: 'center' },
  fondoModal: { flex: 1, backgroundColor: 'rgba(42,20,12,0.82)' }, contenidoModal: { flexGrow: 1, justifyContent: 'center', padding: 22 }, modal: { width: '100%', maxWidth: 500, alignSelf: 'center', backgroundColor: c.superficieTerracota, borderColor: c.bordeNaranja, borderWidth: 1, borderRadius: 23, padding: 24, gap: 16 }, explicacion: { color: c.textoSobreOscuro, fontSize: 17, lineHeight: 25 }, botonModal: { flexBasis: 'auto', flexGrow: 0, backgroundColor: c.botonPrincipal },
});
