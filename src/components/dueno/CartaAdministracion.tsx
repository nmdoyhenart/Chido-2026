import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSession } from '../../contexts/AppSessionContext';
import { colores as c } from '../../theme/colores';
import ChidoLoader from '../ui/ChidoLoader';

// Datos visuales de ejemplo. Esta pantalla no consulta ni modifica productos.
const platosEjemplo = [
  { id: 'tacos', nombre: 'Tacos al pastor', descripcion: 'Cerdo marinado, ananá, cilantro y cebolla sobre tortillas de maíz.', categoria: 'Principal', precio: 12500, minutos: 20, disponible: true, icono: 'restaurant-outline' },
  { id: 'nachos', nombre: 'Nachos Chido', descripcion: 'Totopos crujientes con queso fundido, guacamole y pico de gallo.', categoria: 'Entrada', precio: 8900, minutos: 15, disponible: true, icono: 'flame-outline' },
  { id: 'burrito', nombre: 'Burrito de vegetales', descripcion: 'Vegetales asados, arroz, porotos negros y salsa de la casa.', categoria: 'Principal', precio: 11000, minutos: 25, disponible: false, icono: 'leaf-outline' },
  { id: 'churros', nombre: 'Churros con chocolate', descripcion: 'Churros tibios con azúcar y canela, acompañados de chocolate.', categoria: 'Postre', precio: 6500, minutos: 10, disponible: true, icono: 'cafe-outline' },
] satisfies { id: string; nombre: string; descripcion: string; categoria: string; precio: number; minutos: number; disponible: boolean; icono: keyof typeof Ionicons.glyphMap }[];
type TipoProducto = 'plato' | 'bebida';
type Producto = Omit<typeof platosEjemplo[number], 'icono'> & { tipoProducto: TipoProducto; icono: keyof typeof Ionicons.glyphMap };
const productos: Producto[] = [
  ...platosEjemplo.map(plato => ({ ...plato, tipoProducto: 'plato' as const })),
  { id: 'limonada', tipoProducto: 'bebida', nombre: 'Limonada con menta', descripcion: 'Limón recién exprimido, menta fresca y hielo.', categoria: 'Sin alcohol', precio: 4500, minutos: 5, disponible: true, icono: 'leaf-outline' },
  { id: 'margarita', tipoProducto: 'bebida', nombre: 'Margarita clásica', descripcion: 'Tequila, licor de naranja y lima, con borde de sal.', categoria: 'Cóctel', precio: 7800, minutos: 8, disponible: true, icono: 'wine-outline' },
  { id: 'horchata', tipoProducto: 'bebida', nombre: 'Agua de horchata', descripcion: 'Bebida de arroz con canela y un toque de vainilla.', categoria: 'Sin alcohol', precio: 4200, minutos: 5, disponible: false, icono: 'cafe-outline' },
];
type Accion = { tipo: 'agregar'; tipoProducto: TipoProducto } | { tipo: 'editar' | 'eliminar'; plato: Producto };
const filtros = ['Todos', 'Disponibles', 'Pausados'] as const;
const tipos = ['Todos', 'Platos', 'Bebidas'] as const;
const PRODUCTOS_POR_PAGINA = 3;
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function CartaAdministracion() {
  const router = useRouter();
  const { role, mode, cargando } = useAppSession();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<typeof filtros[number]>('Todos');
  const [tipo, setTipo] = useState<typeof tipos[number]>('Todos');
  const [accion, setAccion] = useState<Accion | null>(null);
  const [pagina, setPagina] = useState(0);
  const [altoControles, setAltoControles] = useState(0);
  const [altoLista, setAltoLista] = useState(0);
  const visibles = productos.filter(p => normalizar(p.nombre + ' ' + p.descripcion).includes(normalizar(busqueda.trim()))
    && (tipo === 'Todos' || p.tipoProducto === (tipo === 'Platos' ? 'plato' : 'bebida'))
    && (filtro === 'Todos' || (filtro === 'Disponibles' ? p.disponible : !p.disponible)));
  const bebida = (accion?.tipo === 'agregar' ? accion.tipoProducto : accion?.plato.tipoProducto) === 'bebida';
  const nombreTipo = bebida ? 'bebida' : 'plato';
  const totalPaginas = 1 + Math.ceil(Math.max(0, visibles.length - 1) / PRODUCTOS_POR_PAGINA);
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaActual === 0 ? 0 : 1 + (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  const productosPagina = visibles.slice(inicio, inicio + (paginaActual === 0 ? 1 : PRODUCTOS_POR_PAGINA));
  // La portada contiene un producto; el resto se recorre de a tres sin repetirlo.
  // La altura de las siguientes tarjetas reserva tres lugares incluso si quedan menos.
  const altoTarjeta = Math.max(180, paginaActual === 0
    ? altoLista - altoControles - 32
    : (altoLista - 24 - 16) / PRODUCTOS_POR_PAGINA);

  if (cargando) return <ChidoLoader mensaje="Cargando carta…" />;
  if (!['authenticated', 'simulation'].includes(mode ?? '') || (role !== 'dueño' && role !== 'supervisor')) return <Redirect href="/(app)/home" />;

  return <SafeAreaView style={s.pantalla} edges={['top', 'left', 'right']}>
    <StatusBar style="light" />
    <View style={s.cabecera}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={() => router.replace('/(app)/home')} style={s.volver}>
        <Ionicons name="arrow-back" size={24} color={c.textoSobreOscuro} />
      </TouchableOpacity>
      <View style={s.flex}><Text style={s.encabezado}>Gestionar carta</Text><Text style={s.subtitulo}>{role === 'dueño' ? 'Dueño' : 'Supervisor'} · Vista previa</Text></View>
      <Ionicons name="book-outline" size={28} color={c.textoSecundarioAlternativo} />
    </View>
    <SafeAreaView edges={['bottom']} style={s.cuerpo}>
      <ScrollView key={paginaActual} keyboardShouldPersistTaps="handled" style={s.lista} onLayout={({ nativeEvent }) => setAltoLista(nativeEvent.layout.height)} contentContainerStyle={s.contenido}>
        {paginaActual === 0 && <View style={s.controles} onLayout={({ nativeEvent }) => setAltoControles(nativeEvent.layout.height)}>
          <View><Text style={s.titulo}>Carta de Chido</Text><Text style={s.intro}>Agregá, editá y organizá platos y bebidas.</Text></View>
        <View style={s.resumen}>
          {([
            { titulo: 'Platos', icono: 'restaurant-outline', cantidad: productos.filter(p => p.tipoProducto === 'plato').length },
            { titulo: 'Bebidas', icono: 'wine-outline', cantidad: productos.filter(p => p.tipoProducto === 'bebida').length },
            { titulo: 'Disponibles', icono: 'checkmark-circle-outline', cantidad: productos.filter(p => p.disponible).length },
            { titulo: 'Pausados', icono: 'pause-circle-outline', cantidad: productos.filter(p => !p.disponible).length },
          ] as const).map(item => <View key={item.titulo} style={s.contador} accessible accessibilityLabel={`${item.cantidad} ${item.titulo.toLowerCase()}`}>
            <View style={s.contadorNumero}><Ionicons name={item.icono} size={18} color={c.textoSobreOscuro} /><Text style={s.numero}>{item.cantidad}</Text></View>
            <Text style={s.resumenTexto}>{item.titulo}</Text>
          </View>)}
        </View>
        <View style={s.altas}>
          <TouchableOpacity accessibilityRole="button" onPress={() => { setAccion({ tipo: 'agregar', tipoProducto: 'plato' }); }} activeOpacity={0.8} style={[s.agregar, s.alta]}>
            <Ionicons name="add" size={20} color={c.textoSobreOscuro} /><Text style={[s.botonTexto, s.textoAlta]}>Agregar plato</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => { setAccion({ tipo: 'agregar', tipoProducto: 'bebida' }); }} activeOpacity={0.8} style={[s.agregar, s.alta]}>
            <Ionicons name="add" size={20} color={c.textoSobreOscuro} /><Text style={[s.botonTexto, s.textoAlta]}>Agregar bebida</Text>
          </TouchableOpacity>
        </View>
        <View style={s.buscador}>
          <Ionicons name="search-outline" size={22} color={c.textoSecundarioSobreOscuro} />
          <TextInput accessibilityLabel="Buscar platos o bebidas" placeholder="Buscar platos o bebidas…" placeholderTextColor={c.textoSecundarioSobreOscuro} value={busqueda} onChangeText={texto => { setBusqueda(texto); setPagina(0); }} style={s.busqueda} returnKeyType="search" />
          {!!busqueda && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => { setBusqueda(''); setPagina(0); }} style={s.limpiar}><Ionicons name="close-circle" size={22} color={c.textoSecundarioSobreOscuro} /></TouchableOpacity>}
        </View>
        <View style={s.tipos}>{tipos.map(item => <TouchableOpacity key={item} accessibilityRole="button" accessibilityLabel={`Mostrar ${item.toLowerCase()}`} accessibilityState={{ selected: tipo === item }} onPress={() => { setTipo(item); setPagina(0); }} style={[s.tipo, tipo === item && s.tipoActivo]}><Text style={[s.filtroTexto, tipo === item && s.filtroTextoActivo]}>{item}</Text></TouchableOpacity>)}</View>
        <Text style={s.etiquetaFiltro}>Disponibilidad</Text>
        <View style={s.filtros}>{filtros.map(item => <TouchableOpacity key={item} accessibilityRole="button" accessibilityLabel={`Disponibilidad: ${item.toLowerCase()}`} accessibilityState={{ selected: filtro === item }} onPress={() => { setFiltro(item); setPagina(0); }} style={[s.filtro, filtro === item && s.filtroActivo]}><Text style={[s.filtroTexto, filtro === item && s.filtroTextoActivo]}>{item}</Text></TouchableOpacity>)}</View>
        </View>}
        {productosPagina.map(plato => <View key={plato.id} style={[s.tarjeta, { minHeight: altoTarjeta }]}>
          <View style={s.fila}>
            <View style={s.ilustracion}><Ionicons name={plato.icono} size={26} color={c.textoSobreOscuro} /></View>
            <View style={s.flex}><Text style={s.categoria}>{plato.tipoProducto === 'bebida' ? 'Bebida' : 'Plato'} · {plato.categoria}</Text><Text style={s.nombreTarjeta}>{plato.nombre}</Text></View>
          </View>
          <Text style={s.descripcionTarjeta}>{plato.descripcion}</Text>
          <View style={s.datos}>
            <Text style={s.precio}>$ {plato.precio.toLocaleString('es-AR')}</Text>
            <View style={s.tiempo}><Ionicons name="time-outline" size={17} color={c.textoSecundarioSobreOscuro} /><Text style={s.descripcionTarjeta}>{plato.minutos} min</Text></View>
            <View style={s.estado}><View style={[s.puntoEstado, { backgroundColor: plato.disponible ? c.activo : c.superficieNaranja }]} /><Text style={s.estadoTexto}>{plato.disponible ? 'Disponible' : 'Pausado'}</Text></View>
          </View>
          <View style={s.acciones}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Editar ${plato.nombre}`} onPress={() => setAccion({ tipo: 'editar', plato })} style={s.editar}><Ionicons name="create-outline" size={21} color={c.textoSobreClaro} /><Text style={s.editarTexto}>Editar</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Eliminar ${plato.nombre}`} onPress={() => setAccion({ tipo: 'eliminar', plato })} style={s.eliminar}><Ionicons name="trash-outline" size={19} color={c.textoSobreOscuro} /><Text style={s.eliminarTexto}>Eliminar</Text></TouchableOpacity>
          </View>
        </View>)}
        {!visibles.length && <View style={s.vacio}><Ionicons name="search-outline" size={32} color={c.textoSobreOscuro} /><Text style={s.intro}>No encontramos productos con esos filtros.</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setBusqueda(''); setFiltro('Todos'); setTipo('Todos'); setPagina(0); }} style={s.volver}><Text style={s.botonTexto}>Ver todos</Text></TouchableOpacity></View>}
      </ScrollView>
      {!!visibles.length && <View style={s.paginacion}>
        <Text style={s.paginaTexto} accessibilityLiveRegion="polite">{paginaActual === 0 ? 'Producto 1' : `Productos ${inicio + 1}–${inicio + productosPagina.length}`} de {visibles.length} · Página {paginaActual + 1} de {totalPaginas}</Text>
        <View style={s.fila}>
          <TouchableOpacity accessibilityRole="button" disabled={paginaActual === 0} accessibilityState={{ disabled: paginaActual === 0 }} onPress={() => setPagina(paginaActual - 1)} style={[s.botonPagina, paginaActual === 0 && s.deshabilitado]}><Text style={s.botonTexto}>‹ Anterior</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={paginaActual === totalPaginas - 1} accessibilityState={{ disabled: paginaActual === totalPaginas - 1 }} onPress={() => setPagina(paginaActual + 1)} style={[s.botonPagina, paginaActual === totalPaginas - 1 && s.deshabilitado]}><Text style={s.botonTexto}>{paginaActual === 0 ? 'Ver más ›' : 'Siguiente ›'}</Text></TouchableOpacity>
        </View>
      </View>}
    </SafeAreaView>
    <Modal visible={accion !== null} transparent animationType="slide" onRequestClose={() => setAccion(null)}>
      <SafeAreaView style={s.fondoModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalContenedor}>
          <View style={s.modal} accessibilityViewIsModal>
            <View style={s.fila}><Text style={[s.nombre, s.flex]}>{accion?.tipo === 'agregar' ? (bebida ? 'Nueva bebida' : 'Nuevo plato') : `${accion?.tipo === 'editar' ? 'Editar' : 'Eliminar'} ${nombreTipo}`}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar vista previa" onPress={() => setAccion(null)} style={s.limpiar}><Ionicons name="close" size={26} color={c.textoSobreOscuro} /></TouchableOpacity></View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
              <Text style={s.descripcion}>Vista previa del diseño. Los cambios todavía no se guardan.</Text>
              {accion?.tipo === 'eliminar' ? <><View style={s.iconoEliminar}><Ionicons name="trash-outline" size={36} color={c.textoSobreOscuro} /></View><Text style={s.nombre}>{accion.plato.nombre}</Text><Text style={s.descripcion}>Aquí podrás confirmar la eliminación de {bebida ? 'esta bebida' : 'este plato'} de la carta.</Text></> : accion && <>
                <View style={s.foto}><Ionicons name="camera-outline" size={32} color={c.textoSobreOscuro} /><Text style={s.descripcion}>Fotos {bebida ? 'de la bebida' : 'del plato'}</Text><Text style={s.ayuda}>Vista previa del espacio para imágenes</Text></View>
                <Campo key={accion.tipo + ('plato' in accion ? accion.plato.id : nombreTipo) + 'nombre'} titulo={`Nombre ${bebida ? 'de la bebida' : 'del plato'}`} valor={'plato' in accion ? accion.plato.nombre : ''} placeholder={bebida ? 'Ej. Limonada con menta' : 'Ej. Tacos al pastor'} />
                <Campo key={accion.tipo + 'descripcion'} titulo="Descripción" valor={'plato' in accion ? accion.plato.descripcion : ''} placeholder="Ingredientes y presentación" multilinea />
                <Campo key={accion.tipo + 'precio'} titulo="Precio ($)" valor={'plato' in accion ? String(accion.plato.precio) : ''} placeholder="0" numerico />
                <Campo key={accion.tipo + 'minutos'} titulo="Tiempo de preparación (min)" valor={'plato' in accion ? String(accion.plato.minutos) : ''} placeholder="20" numerico />
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

function Campo({ titulo, valor, placeholder, multilinea = false, numerico = false }: { titulo: string; valor: string; placeholder: string; multilinea?: boolean; numerico?: boolean }) {
  return <View style={{ gap: 6 }}><Text style={s.etiqueta}>{titulo}</Text><TextInput accessibilityLabel={titulo} defaultValue={valor} placeholder={placeholder} placeholderTextColor={c.textoSecundarioSobreOscuro} multiline={multilinea} keyboardType={numerico ? 'decimal-pad' : 'default'} style={[s.campo, multilinea && { minHeight: 84, textAlignVertical: 'top' }]} /></View>;
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.cabecera },
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
