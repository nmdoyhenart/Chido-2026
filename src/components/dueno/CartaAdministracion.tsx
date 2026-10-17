import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSession } from '../../contexts/AppSessionContext';
import { colores as c } from '../../theme/colores';
import ChidoLoader from '../ui/ChidoLoader';
import { Header } from '../Header';
import { getProductos } from '../../services/productos.service';
import { useCampoVisibleConTeclado } from '../../hooks/useCampoVisibleConTeclado';

type TipoProducto = 'plato' | 'bebida';
type Producto = {
  id: string; nombre: string; descripcion: string; precio: number; minutos: number;
  foto?: string; tipoProducto: TipoProducto; icono: keyof typeof Ionicons.glyphMap;
};
type Accion = { tipo: 'agregar'; tipoProducto: TipoProducto } | { tipo: 'editar' | 'eliminar'; plato: Producto };
const tipos = ['Todos', 'Platos', 'Bebidas'] as const;
const MAX_PRODUCTOS_POR_PAGINA = 3;
const ALTO_LINEA_DESCRIPCION = 19;
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function CartaAdministracion({ soloLectura = false, soloTipoProducto }: { soloLectura?: boolean; soloTipoProducto?: TipoProducto }) {
  const router = useRouter();
  const { role, mode, cargando, usuario } = useAppSession();
  const rolVisible = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  const nombreVisible = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ').trim() || rolVisible;
  const simulacion = mode === 'simulation';
  const autorizado = role === 'dueño' || role === 'supervisor' || (soloLectura && (role === 'cocinero' || role === 'cocina' || role === 'cantinero'));
  const [productosReales, setProductosReales] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    if (cargando || (mode !== 'authenticated' && mode !== 'simulation') || !autorizado) return;
    let activo = true;
    setCargandoProductos(true);
    setErrorProductos(null);
    void getProductos().then(datos => {
      if (!activo) return;
      setProductosReales(datos.map((p): Producto => ({
        id: p.id, nombre: p.nombre, descripcion: p.descripcion ?? '',
        precio: Number(p.precio), minutos: Number(p.tiempo_elaboracion),
        tipoProducto: p.tipo === 'bebida' ? 'bebida' : 'plato',
        foto: p.fotos?.find(foto => typeof foto === 'string' && foto.length > 0),
        icono: p.tipo === 'bebida' ? 'wine-outline' : 'restaurant-outline',
      })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.id.localeCompare(b.id)));
    }).catch(() => {
      if (activo) {
        setProductosReales([]);
        setErrorProductos('No pudimos cargar la carta. Revisá la conexión y los permisos de tu cuenta e intentá nuevamente.');
      }
    }).finally(() => { if (activo) setCargandoProductos(false); });
    return () => { activo = false; };
  // La revisión permite volver a consultar al deslizar o pulsar Reintentar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorizado, cargando, mode, revision]));
  const productos = productosReales;
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<typeof tipos[number]>(soloTipoProducto === 'bebida' ? 'Bebidas' : 'Todos');
  const [accion, setAccion] = useState<Accion | null>(null);
  const [pagina, setPagina] = useState(0);
  const [altoLista, setAltoLista] = useState(0);
  const [altoControles, setAltoControles] = useState(0);
  const formulario = useRef<ScrollView>(null);
  const tecladoFormulario = useCampoVisibleConTeclado(formulario);
  const visibles = productos.filter(p => normalizar(p.nombre + ' ' + p.descripcion).includes(normalizar(busqueda.trim()))
    && (!soloTipoProducto || p.tipoProducto === soloTipoProducto)
    && (tipo === 'Todos' || p.tipoProducto === (tipo === 'Platos' ? 'plato' : 'bebida')));
  const bebida = (accion?.tipo === 'agregar' ? accion.tipoProducto : accion?.plato.tipoProducto) === 'bebida';
  const nombreTipo = bebida ? 'bebida' : 'plato';
  const productosEnPortada = soloLectura ? 2 : 1;
  // Sin scroll: entran tantos productos por página como permita el alto (hasta tres),
  // sin que una tarjeta quede por debajo de lo necesario para nombre, precio y botones.
  const altoMinimoTarjeta = soloLectura ? 160 : 224;
  const productosPorPagina = altoLista > 0
    ? Math.max(1, Math.min(MAX_PRODUCTOS_POR_PAGINA, Math.floor((altoLista - 24 + 8) / (altoMinimoTarjeta + 8))))
    : MAX_PRODUCTOS_POR_PAGINA;
  const totalPaginas = 1 + Math.ceil(Math.max(0, visibles.length - productosEnPortada) / productosPorPagina);
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaActual === 0 ? 0 : productosEnPortada + (paginaActual - 1) * productosPorPagina;
  const cantidadEnPagina = paginaActual === 0 ? productosEnPortada : productosPorPagina;
  const productosPagina = visibles.slice(inicio, inicio + cantidadEnPagina);
  // Dueño conserva una tarjeta expandida en portada; Cocinero ve dos tarjetas regulares.
  // Las páginas siguientes reparten el alto en partes iguales entre sus productos.
  const altoTarjetaRegular = Math.max(120, (altoLista - 24 - 8 * (productosPorPagina - 1)) / productosPorPagina);
  const portadaExpandida = paginaActual === 0 && !soloLectura;
  const portadaLectura = paginaActual === 0 && soloLectura;
  const altoTarjetaPortadaLectura = Math.max(110, (altoLista - altoControles - 40) / 2);
  const altoTarjeta = portadaExpandida
    ? Math.max(150, altoLista - altoControles - 32)
    : portadaLectura ? altoTarjetaPortadaLectura : altoTarjetaRegular;
  const fotoPortada = Math.max(44, Math.min(64, altoTarjeta * 0.2));
  // Alto fijo de cada tarjeta sin la descripción (márgenes, nombre en hasta 2 líneas, precio y botones);
  // la descripción muestra sólo las líneas que entran, así la tarjeta nunca se desborda.
  const altoSinDescripcion = portadaExpandida ? 186 + Math.max(fotoPortada, 40)
    : portadaLectura ? 120
      : soloLectura ? 140 : 202;
  const lineasDescripcion = Math.max(0, Math.min(3, Math.floor((altoTarjeta - altoSinDescripcion) / ALTO_LINEA_DESCRIPCION)));

  if (cargando) return <ChidoLoader mensaje="Cargando carta…" />;
  if (!['authenticated', 'simulation'].includes(mode ?? '') || !autorizado) return <Redirect href="/(app)/home" />;

  // El Header ya reserva el área superior (notch / barra de estado), por eso no se incluye 'top'.
  return <SafeAreaView style={s.pantalla} edges={['left', 'right']}>
    <StatusBar style="light" />
    <Header userName={nombreVisible} role={rolVisible} />
    <View style={s.cabecera}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={() => router.replace('/(app)/home')} style={s.volver}>
        <Ionicons name="arrow-back" size={24} color={c.textoSobreOscuro} />
      </TouchableOpacity>
      <View style={s.flex}><Text style={s.encabezado}>{soloLectura ? 'Ver la carta' : 'Gestionar carta'}</Text><Text style={s.subtitulo}>{soloLectura ? 'Solo lectura' : `${role === 'dueño' ? 'Dueño' : 'Supervisor'} · ${simulacion ? 'Solo lectura' : 'Productos'}`}</Text></View>
      <Ionicons name="book-outline" size={28} color={c.textoSecundarioAlternativo} />
    </View>
    <SafeAreaView edges={['bottom']} style={s.cuerpo}>
      {/* Sin scroll: la página ocupa exactamente el alto disponible. */}
      <View style={[s.lista, s.contenido]} onLayout={({ nativeEvent }) => setAltoLista(nativeEvent.layout.height)}>
        {paginaActual === 0 && <View style={s.controles} onLayout={({ nativeEvent }) => setAltoControles(nativeEvent.layout.height)}>
          {/* En "Gestionar carta" se omiten título y contadores para darle más lugar a los productos. */}
          {soloLectura && <View><Text style={s.titulo}>Carta de Chido</Text><Text style={s.intro}>Consultá los productos disponibles.</Text></View>}
        {soloLectura && <View style={s.resumen}>
          {([
            { titulo: 'Platos', icono: 'restaurant-outline', tipoProducto: 'plato', cantidad: productos.filter(p => p.tipoProducto === 'plato').length },
            { titulo: 'Bebidas', icono: 'wine-outline', tipoProducto: 'bebida', cantidad: productos.filter(p => p.tipoProducto === 'bebida').length },
          ] as const).filter(item => !soloTipoProducto || item.tipoProducto === soloTipoProducto).map(item => <View key={item.titulo} style={s.contador} accessible accessibilityLabel={`${item.cantidad} ${item.titulo.toLowerCase()}`}>
            <View style={s.contadorNumero}><Ionicons name={item.icono} size={18} color={c.textoSobreOscuro} /><Text style={s.numero}>{item.cantidad}</Text></View>
            <Text style={s.resumenTexto}>{item.titulo}</Text>
          </View>)}
        </View>}
        {!soloLectura && <View style={s.altas}>
          {/* Usan las mismas pantallas de alta que Cocinero y Cantinero, que guardan el producto. */}
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/productos/alta')} activeOpacity={0.8} style={[s.agregar, s.alta]}>
            <Ionicons name="add" size={20} color={c.textoSobreOscuro} /><Text style={[s.botonTexto, s.textoAlta]}>Agregar plato</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/productos/alta-bebida')} activeOpacity={0.8} style={[s.agregar, s.alta]}>
            <Ionicons name="add" size={20} color={c.textoSobreOscuro} /><Text style={[s.botonTexto, s.textoAlta]}>Agregar bebida</Text>
          </TouchableOpacity>
        </View>}
        <View style={s.buscador}>
          <Ionicons name="search-outline" size={22} color={c.textoSecundarioSobreOscuro} />
          <TextInput accessibilityLabel="Buscar platos o bebidas" placeholder="Buscar platos o bebidas…" placeholderTextColor={c.textoSecundarioSobreOscuro} value={busqueda} onChangeText={texto => { setBusqueda(texto); setPagina(0); }} style={s.busqueda} returnKeyType="search" />
          {!!busqueda && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => { setBusqueda(''); setPagina(0); }} style={s.limpiar}><Ionicons name="close-circle" size={22} color={c.textoSecundarioSobreOscuro} /></TouchableOpacity>}
        </View>
        {!soloTipoProducto && <View style={s.tipos}>{tipos.map(item => <TouchableOpacity key={item} accessibilityRole="button" accessibilityLabel={`Mostrar ${item.toLowerCase()}`} accessibilityState={{ selected: tipo === item }} onPress={() => { setTipo(item); setPagina(0); }} style={[s.tipo, tipo === item && s.tipoActivo]}><Text style={[s.filtroTexto, tipo === item && s.filtroTextoActivo]}>{item}</Text></TouchableOpacity>)}</View>}

        </View>}
        {cargandoProductos && <ChidoLoader mensaje="Cargando productos…" />}
        {!cargandoProductos && errorProductos && <View style={s.vacio}><Text style={s.intro} accessibilityLiveRegion="polite">{errorProductos}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setRevision(r => r + 1)} style={s.agregar}><Text style={s.botonTexto}>Reintentar</Text></TouchableOpacity></View>}
        {(!cargandoProductos && !errorProductos) && productosPagina.map(plato => <View key={plato.id} style={[s.tarjeta, { height: altoTarjeta, overflow: 'hidden' }, portadaExpandida && s.tarjetaPortada, portadaLectura && s.tarjetaLectura]}>
          <View style={s.fila}>
            <View style={[s.ilustracion, portadaExpandida && { width: fotoPortada, height: fotoPortada }]}>{plato.foto ? <Image source={{ uri: plato.foto }} accessibilityLabel={plato.nombre} style={{ width: portadaExpandida ? fotoPortada : 36, height: portadaExpandida ? fotoPortada : 36, borderRadius: 8 }} resizeMode="cover" /> : <Ionicons name={plato.icono} size={portadaExpandida ? 36 : 26} color={c.textoSobreOscuro} />}</View>
            <View style={s.flex}><Text style={s.categoria}>{plato.tipoProducto === 'bebida' ? 'Bebida' : 'Plato'}</Text><Text style={s.nombreTarjeta} numberOfLines={2}>{plato.nombre}</Text></View>
          </View>
          {lineasDescripcion > 0 && <Text style={s.descripcionTarjeta} numberOfLines={lineasDescripcion}>{plato.descripcion}</Text>}
          <View style={s.datos}>
            <Text style={s.precio}>$ {plato.precio.toLocaleString('es-AR')}</Text>
            <View style={s.tiempo}><Ionicons name="time-outline" size={17} color={c.textoSecundarioSobreOscuro} /><Text style={s.descripcionTarjeta}>{plato.minutos} min</Text></View>
          </View>
          {!soloLectura && <View style={[s.acciones, portadaExpandida && { marginTop: 0 }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Editar ${plato.nombre}`} onPress={() => setAccion({ tipo: 'editar', plato })} style={s.editar}><Ionicons name="create-outline" size={21} color={c.textoSobreClaro} /><Text style={s.editarTexto}>Editar</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Eliminar ${plato.nombre}`} onPress={() => setAccion({ tipo: 'eliminar', plato })} style={s.eliminar}><Ionicons name="trash-outline" size={19} color={c.textoSobreOscuro} /><Text style={s.eliminarTexto}>Eliminar</Text></TouchableOpacity>
          </View>}
        </View>)}
        {(!cargandoProductos && !errorProductos) && !visibles.length && <View style={s.vacio}><Ionicons name="search-outline" size={32} color={c.textoSobreOscuro} /><Text style={s.intro}>{productos.length ? 'No encontramos productos con esos filtros.' : 'Todavía no hay productos en la carta.'}</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setBusqueda(''); setTipo('Todos'); setPagina(0); }} style={s.volver}><Text style={s.botonTexto}>Ver todos</Text></TouchableOpacity></View>}
      </View>
      {(!cargandoProductos && !errorProductos) && !!visibles.length && <View style={s.paginacion}>
        <Text style={s.paginaTexto} accessibilityLiveRegion="polite">{paginaActual === 0 && !soloLectura ? 'Producto 1' : `Productos ${inicio + 1}–${inicio + productosPagina.length}`} de {visibles.length} · Página {paginaActual + 1} de {totalPaginas}</Text>
        <View style={s.fila}>
          <TouchableOpacity accessibilityRole="button" disabled={paginaActual === 0} accessibilityState={{ disabled: paginaActual === 0 }} onPress={() => setPagina(paginaActual - 1)} style={[s.botonPagina, paginaActual === 0 && s.deshabilitado]}><Text style={s.botonTexto}>‹ Anterior</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={paginaActual === totalPaginas - 1} accessibilityState={{ disabled: paginaActual === totalPaginas - 1 }} onPress={() => setPagina(paginaActual + 1)} style={[s.botonPagina, paginaActual === totalPaginas - 1 && s.deshabilitado]}><Text style={s.botonTexto}>{paginaActual === 0 ? 'Ver más ›' : 'Siguiente ›'}</Text></TouchableOpacity>
        </View>
      </View>}
    </SafeAreaView>
    <Modal visible={accion !== null} transparent animationType="slide" onRequestClose={() => setAccion(null)}>
      <SafeAreaView style={s.fondoModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalContenedor}>
          <View style={s.modal} accessibilityViewIsModal>
            <View style={s.fila}><Text style={[s.nombre, s.flex]}>{accion?.tipo === 'agregar' ? (bebida ? 'Nueva bebida' : 'Nuevo plato') : `${accion?.tipo === 'editar' ? 'Editar' : 'Eliminar'} ${nombreTipo}`}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar vista previa" onPress={() => setAccion(null)} style={s.limpiar}><Ionicons name="close" size={26} color={c.textoSobreOscuro} /></TouchableOpacity></View>
            <ScrollView ref={formulario} keyboardShouldPersistTaps="handled" onScroll={tecladoFormulario.alDesplazar} scrollEventThrottle={16} contentContainerStyle={{ gap: 14, paddingBottom: 16 + tecladoFormulario.rellenoInferior }}>
              <Text style={s.descripcion}>Vista previa del diseño. Los cambios todavía no se guardan.</Text>
              {accion?.tipo === 'eliminar' ? <><View style={s.iconoEliminar}><Ionicons name="trash-outline" size={36} color={c.textoSobreOscuro} /></View><Text style={s.nombre}>{accion.plato.nombre}</Text><Text style={s.descripcion}>Aquí podrás confirmar la eliminación de {bebida ? 'esta bebida' : 'este plato'} de la carta.</Text></> : accion && <>
                <View style={s.foto}><Ionicons name="camera-outline" size={32} color={c.textoSobreOscuro} /><Text style={s.descripcion}>Fotos {bebida ? 'de la bebida' : 'del plato'}</Text><Text style={s.ayuda}>Vista previa del espacio para imágenes</Text></View>
                <Campo key={accion.tipo + ('plato' in accion ? accion.plato.id : nombreTipo) + 'nombre'} titulo={`Nombre ${bebida ? 'de la bebida' : 'del plato'}`} valor={'plato' in accion ? accion.plato.nombre : ''} placeholder={bebida ? 'Ej. Limonada con menta' : 'Ej. Tacos al pastor'} onFocus={tecladoFormulario.alEnfocar} />
                <Campo key={accion.tipo + 'descripcion'} titulo="Descripción" valor={'plato' in accion ? accion.plato.descripcion : ''} placeholder="Ingredientes y presentación" multilinea onFocus={tecladoFormulario.alEnfocar} />
                <Campo key={accion.tipo + 'precio'} titulo="Precio ($)" valor={'plato' in accion ? String(accion.plato.precio) : ''} placeholder="0" numerico onFocus={tecladoFormulario.alEnfocar} />
                <Campo key={accion.tipo + 'minutos'} titulo="Tiempo de preparación (min)" valor={'plato' in accion ? String(accion.plato.minutos) : ''} placeholder="20" numerico onFocus={tecladoFormulario.alEnfocar} />
              </>}
              <View accessibilityRole="button" accessibilityState={{ disabled: true }} style={[s.agregar, s.deshabilitado]}><Text style={s.botonTexto}>{accion?.tipo === 'eliminar' ? 'Eliminar' : 'Guardar'} {nombreTipo}</Text></View>
              <Text style={s.ayuda}>Disponible en la próxima etapa.</Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

function Campo({ titulo, valor, placeholder, multilinea = false, numerico = false, onFocus }: { titulo: string; valor: string; placeholder: string; multilinea?: boolean; numerico?: boolean; onFocus: ComponentProps<typeof TextInput>['onFocus'] }) {
  return <View style={{ gap: 6 }}><Text style={s.etiqueta}>{titulo}</Text><TextInput accessibilityLabel={titulo} defaultValue={valor} placeholder={placeholder} placeholderTextColor={c.textoSecundarioSobreOscuro} multiline={multilinea} keyboardType={numerico ? 'decimal-pad' : 'default'} onFocus={onFocus} style={[s.campo, multilinea && { minHeight: 84, textAlignVertical: 'top' }]} /></View>;
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.fondo },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  volver: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.textoSecundarioAlternativo, borderRadius: 12 },
  flex: { flex: 1, minWidth: 0 },
  encabezado: { color: c.textoSobreOscuro, fontSize: 22, fontWeight: '800' },
  subtitulo: { color: c.textoSecundarioSobreOscuro, fontSize: 13, marginTop: 4 },
  cuerpo: { flex: 1, backgroundColor: c.fondo },
  paginacion: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.textoSecundarioAlternativo + '55', gap: 8 },
  paginaTexto: { color: c.textoSobreOscuro, fontSize: 12, textAlign: 'center' },
  botonPagina: { flex: 1, minHeight: 44, padding: 10, borderRadius: 12, backgroundColor: c.cabecera, borderWidth: 1, borderColor: c.textoSecundarioAlternativo, justifyContent: 'center' },
  controles: { gap: 10 },
  tarjetaPortada: { justifyContent: 'space-between', padding: 16, gap: 14 },
  tarjetaLectura: { padding: 10, gap: 4 },
  abrirOpciones: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, backgroundColor: c.cabecera, borderRadius: 12, borderWidth: 1, borderColor: c.textoSecundarioAlternativo },
  lista: { flex: 1 },
  contenido: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  nombreTarjeta: { color: c.textoSobreOscuro, fontSize: 19, lineHeight: 23, fontWeight: '700' },
  descripcionTarjeta: { color: c.textoSecundarioSobreOscuro, fontSize: 14, lineHeight: 19 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 },
  avisoTexto: { color: c.textoSobreOscuro, fontSize: 13, flex: 1 },
  titulo: { color: c.textoSobreOscuro, fontSize: 22, fontWeight: '700' },
  intro: { color: c.textoSecundarioSobreOscuro, fontSize: 13, lineHeight: 18, marginTop: 4 },
  resumen: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.textoSecundarioAlternativo + '44' },
  contador: { flexGrow: 1, flexBasis: 70, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 4 },
  contadorNumero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  resumenTexto: { color: c.textoSobreOscuro, fontSize: 11, textAlign: 'center' },
  numero: { color: c.textoSobreOscuro, fontSize: 18, lineHeight: 22, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.activo },
  agregar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.botonPrincipal, borderWidth: 1, borderColor: c.bordeError, borderRadius: 14, padding: 16, minHeight: 54 },
  botonTexto: { color: c.textoSobreOscuro, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  buscador: { backgroundColor: c.cabecera + '66', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8, minHeight: 44 },
  busqueda: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 8, color: c.textoSobreOscuro },
  limpiar: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: c.botonPrincipal, borderRadius: 12 },
  altas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  alta: { flexGrow: 1, flexBasis: 140, paddingHorizontal: 8, paddingVertical: 8, minHeight: 44, backgroundColor: c.cabecera, borderColor: c.textoSecundarioAlternativo, borderRadius: 12 },
  textoAlta: { flexShrink: 1, fontSize: 14 },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, borderBottomWidth: 1, borderBottomColor: c.textoSecundarioAlternativo + '44' },
  tipo: { flexGrow: 1, minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: c.cabecera, borderRadius: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tipoActivo: { backgroundColor: c.botonPrincipal, borderBottomColor: c.textoSobreOscuro },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filtro: { minHeight: 44, justifyContent: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.cabecera, borderWidth: 1, borderColor: 'transparent' },
  filtroActivo: { backgroundColor: c.botonPrincipal, borderColor: c.textoSecundarioAlternativo },
  filtroTexto: { color: c.textoSobreOscuro, fontSize: 14 },
  filtroTextoActivo: { fontWeight: '700' },
  resultados: { color: c.textoSobreOscuro, marginBottom: 12, fontSize: 13 },
  tarjeta: { backgroundColor: c.cabecera, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: c.textoSecundarioAlternativo + '88' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ilustracion: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  categoria: { color: c.textoSecundarioSobreOscuro, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  nombre: { color: c.textoSobreOscuro, fontSize: 21, fontWeight: '800' },
  descripcion: { color: c.textoSecundarioSobreOscuro, fontSize: 15, lineHeight: 22 },
  datos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  precio: { color: c.textoSobreOscuro, fontSize: 20, fontWeight: '800' },
  tiempo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  puntoEstado: { width: 6, height: 6, borderRadius: 3 },
  estadoTexto: { color: c.textoSecundarioSobreOscuro, fontSize: 12 },
  acciones: { borderTopWidth: 1, borderTopColor: c.textoSecundarioAlternativo + '44', paddingTop: 8, marginTop: 'auto', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  editar: { flexGrow: 1, flexBasis: 140, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6, backgroundColor: c.superficie, borderRadius: 12 },
  editarTexto: { color: c.textoSobreClaro, fontSize: 15, fontWeight: '700' },
  eliminar: { flexGrow: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6, backgroundColor: c.botonPrincipal, borderWidth: 1, borderColor: c.bordeError, borderRadius: 12 },
  eliminarTexto: { color: c.textoSobreOscuro, fontSize: 14, fontWeight: '700' },
  vacio: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  fondoModal: { flex: 1, backgroundColor: '#2B160EBB' },
  modalContenedor: { flex: 1, justifyContent: 'flex-end', padding: 12 },
  modal: { borderWidth: 2, borderColor: c.textoSecundarioAlternativo, maxHeight: '95%', backgroundColor: c.cabecera, padding: 20, borderRadius: 24, gap: 16 },
  foto: { borderWidth: 1, borderStyle: 'dashed', borderColor: c.textoSecundarioSobreOscuro, borderRadius: 14, minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: 14, gap: 6 },
  etiqueta: { color: c.textoSobreOscuro, fontSize: 14, fontWeight: '700' },
  etiquetaFiltro: { color: c.textoSecundarioSobreOscuro, fontSize: 12 },
  campo: { backgroundColor: c.acento, borderWidth: 1, borderColor: c.textoSecundarioAlternativo, color: c.textoSobreOscuro, borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16 },
  ayuda: { color: c.textoSecundarioSobreOscuro, fontSize: 12, textAlign: 'center' },
  deshabilitado: { opacity: 0.45 },
  iconoEliminar: { alignItems: 'center', padding: 16 },
});
