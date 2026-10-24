import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { ResultadoModal } from '../../components/ui/ResultadoModal';
import { supabase } from '../../../lib/supabase';
import { colores } from '../../theme/colores';
import { useAppSession } from '../../contexts/AppSessionContext';
import { confirmarPagoMozo, getPedidosMozo, getSolicitudesCuentaMozo, actualizarEstadoPedido, entregarPedido, type SolicitudCuentaMozo } from '../../services/pedidos.service';

const ESTADOS = ['todos', 'pendiente_mozo', 'confirmado', 'en_preparacion', 'listo_para_entregar', 'entregado', 'recibido', 'pago_informado', 'pagado', 'rechazado'];

// Alto mínimo para que mesa, cliente, productos y botones entren sin achicar la letra.
const ITEM_HEIGHT = 224;
const ITEM_MARGIN = 12;
const LIST_PADDING = 16;
const MAX_PEDIDOS_POR_PAGINA = 3;

export default function PedidosMozo() {
  const insets = useSafeAreaInsets();
  const { usuario, role } = useAppSession();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('todos');
  const [pagina, setPagina] = useState(0);
  const [altoLista, setAltoLista] = useState(0);
  const [solicitudesCuenta, setSolicitudesCuenta] = useState<SolicitudCuentaMozo[]>([]);
  const [confirmandoPagoId, setConfirmandoPagoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; titulo: string; mensaje: string } | null>(null);

  useEffect(() => {
    const cargarPedidos = async () => {
      try {
        const data = await getPedidosMozo();
        if (data) setPedidos(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
      try {
        setSolicitudesCuenta(await getSolicitudesCuentaMozo());
      } catch (error) {
        console.error('No se pudieron cargar las solicitudes de cuenta:', error);
      }
    };
    cargarPedidos();
    const channel = supabase
      .channel('pedidos_mozo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        cargarPedidos();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
        cargarPedidos();
      })
      .subscribe();
    const intervalo = setInterval(() => { void cargarPedidos(); }, 8000);

    return () => {
      clearInterval(intervalo);
      supabase.removeChannel(channel);
    };
  }, []);

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await actualizarEstadoPedido(id, nuevoEstado);
    } catch (error) {
      setAviso({ tipo: 'error', titulo: 'No pudimos actualizar el pedido', mensaje: error instanceof Error ? error.message : 'Intentá nuevamente.' });
    }
  };

  const cambiarEntregado = async (id: string) => {
    try {
      await entregarPedido(id);
    } catch (error) {
      setAviso({ tipo: 'error', titulo: 'El pedido todavía no está listo', mensaje: error instanceof Error ? error.message : 'Cocina y bar deben terminar los productos.' });
    }
  };

  const confirmarPago = async (solicitud: SolicitudCuentaMozo) => {
    setConfirmandoPagoId(solicitud.pedido_id);
    try {
      await confirmarPagoMozo(solicitud.pedido_id);
      setSolicitudesCuenta((actuales) => actuales.filter((actual) => actual.pedido_id !== solicitud.pedido_id));
      setAviso({ tipo: 'exito', titulo: 'Pago confirmado', mensaje: `La mesa ${solicitud.numero} quedó liberada y avisamos al dueño y al supervisor.` });
    } catch (error) {
      setAviso({ tipo: 'error', titulo: 'No pudimos confirmar el pago', mensaje: error instanceof Error ? error.message : 'Actualizá el listado antes de reintentar.' });
    } finally {
      setConfirmandoPagoId(null);
    }
  };

  const getStatusBgColor = (estado: string) => {
    switch (estado) {
      case 'pendiente_mozo': return 'bg-chido-aviso text-chido-texto-sobre-oscuro';
      case 'confirmado': return 'bg-chido-exito text-chido-texto-sobre-oscuro';
      case 'en_preparacion': return 'bg-chido-botonPrincipal text-chido-texto-sobre-oscuro';
      case 'entregado': return 'bg-chido-superficieTerracota text-white';
      case 'recibido': return 'bg-chido-exito text-chido-texto-sobre-oscuro';
      case 'pago_informado': return 'bg-chido-aviso text-chido-texto-sobre-oscuro';
      case 'pagado': return 'bg-chido-exito text-chido-texto-sobre-oscuro';
      case 'rechazado': return 'bg-chido-error text-chido-texto-sobre-oscuro';
      default: return 'bg-chido-superficieTerracota text-white';
    }
  };

  const inicioDelDia = new Date();
  inicioDelDia.setHours(0, 0, 0, 0);
  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (filtro === 'todos') return true;
    if (filtro === 'listo_para_entregar') {
      return pedido.estado === 'en_preparacion'
        && pedido.pedido_detalles?.length > 0
        && pedido.pedido_detalles.every((detalle: { estado_sector: string }) => detalle.estado_sector === 'listo');
    }
    if (pedido.estado !== filtro) return false;
    return filtro !== 'pendiente_mozo' || new Date(pedido.created_at) >= inicioDelDia;
  });
  // Entran tantos pedidos por página como permita el alto del celular (hasta 3), sin bajar del alto mínimo.
  const pedidosPorPagina = altoLista > 0
    ? Math.max(1, Math.min(MAX_PEDIDOS_POR_PAGINA, Math.floor((altoLista - LIST_PADDING * 2 + ITEM_MARGIN) / (ITEM_HEIGHT + ITEM_MARGIN))))
    : MAX_PEDIDOS_POR_PAGINA;
  const totalPaginas = Math.max(1, Math.ceil(pedidosFiltrados.length / pedidosPorPagina));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaActual * pedidosPorPagina;
  const pedidosVisibles = pedidosFiltrados.slice(inicio, inicio + pedidosPorPagina);
  // Siempre reserva los lugares de la página: la última conserva las proporciones.
  const altoTarjeta = Math.max(ITEM_HEIGHT,
    (altoLista - LIST_PADDING * 2 - ITEM_MARGIN * (pedidosPorPagina - 1)) / pedidosPorPagina);

  // Una actualización en tiempo real puede quitar pedidos del filtro actual.
  if (pagina !== paginaActual) setPagina(paginaActual);

  const userName = usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Mozo";
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Mozo";

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={userName} role={`${displayRole} - Pedidos`} />

      <View className="py-4 bg-chido-fondo">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {ESTADOS.map(est => (
            <TouchableOpacity
              key={est}
              onPress={() => { setFiltro(est); setPagina(0); }}
              className={`px-4 py-2 rounded-full border-2 border-white/70 ${filtro === est ? 'bg-chido-acento' : 'bg-chido-cabecera'}`}
            >
                <Text className="text-lg font-bold capitalize text-chido-texto-sobre-oscuro">
                {est === 'listo_para_entregar' ? 'Listos para entregar' : est.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {solicitudesCuenta.length > 0 && <View className="mx-5 mb-2 rounded-2xl border-2 border-white/70 bg-chido-botonPrincipal p-5">
        <View className="mb-2 flex-row items-center">
          <Ionicons name="receipt-outline" size={30} color={colores.textoSobreOscuro} />
          <Text className="ml-3 text-2xl font-extrabold text-chido-texto-sobre-oscuro">Pidieron la cuenta</Text>
        </View>
        {solicitudesCuenta.map(solicitud => <View key={solicitud.pedido_id} className="py-3 border-t border-white/20">
          <Text className="text-lg font-semibold text-chido-texto-sobre-oscuro">Mesa {solicitud.numero} · {solicitud.cliente}</Text>
          <TouchableOpacity
            disabled={confirmandoPagoId !== null}
            className="mt-3 min-h-14 items-center justify-center rounded-xl border-2 border-white/70 bg-chido-exito px-3"
            onPress={() => void confirmarPago(solicitud)}
          >
            {confirmandoPagoId === solicitud.pedido_id ? <ChidoLoader compacto mensaje="Confirmando pago…" /> : <Text className="text-lg font-bold text-chido-texto-sobre-oscuro">Confirmar pago y liberar mesa</Text>}
          </TouchableOpacity>
        </View>)}
      </View>}

      {loading ? (
        <ChidoLoader mensaje="Cargando pedidos…" />
      ) : (
        <View style={styles.contenido}>
        <FlatList
          key={`${filtro}-${paginaActual}`}
          style={styles.lista}
          onLayout={({ nativeEvent }) => setAltoLista(nativeEvent.layout.height)}
          data={pedidosVisibles}
          extraData={altoTarjeta}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: LIST_PADDING }}
          ItemSeparatorComponent={() => <View style={{ height: ITEM_MARGIN }} />}
          showsVerticalScrollIndicator
          ListEmptyComponent={<Text className="text-chido-texto-sobre-oscuro text-center mt-10 text-lg">No hay pedidos.</Text>}
          renderItem={({ item }) => {
            const bgClass = getStatusBgColor(item.estado).split(' ')[0];
            const textClass = getStatusBgColor(item.estado).split(' ')[1];
            return (
            <View 
              className="bg-chido-cabecera border-2 border-white/70 rounded-2xl flex-col"
              // minHeight: si aparece "El cliente pidió la cuenta" la tarjeta crece en vez de sacar los botones afuera.
              style={{ minHeight: altoTarjeta, padding: 16 }}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-2">
                  <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro" numberOfLines={1}>
                    Mesa {item.mesas?.numero}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
                    <Text className="text-xl font-semibold text-chido-texto-secundario-sobre-oscuro">
                      {item.cliente_nombre || [item.usuarios?.nombres, item.usuarios?.apellidos].filter(Boolean).join(' ') || 'Cliente'} · {item.mesas?.tipo} • {item.mesas?.cantidad_comensales} personas
                    </Text>
                  </ScrollView>
                </View>
                <View className="items-end" style={{ maxWidth: '48%', flexShrink: 1 }}>
                  <Text className="mb-2 text-3xl font-extrabold text-chido-texto-sobre-oscuro" numberOfLines={1}>${item.total}</Text>
                  <View className={`rounded-full border border-white/40 px-3 py-1.5 ${bgClass}`}>
                    <Text className={`text-center text-base font-bold ${textClass}`} numberOfLines={1}>
                      {item.estado.replaceAll('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              {!!item.pedido_detalles?.length && <View className="mt-4 border-t border-white/30 pt-3">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
                  {item.pedido_detalles.map((detalle: { id: string; cantidad: number; estado_sector: string; productos?: { nombre?: string; tipo?: string } | null }) => <Text key={detalle.id} className="mr-6 text-lg text-chido-texto-secundario-sobre-oscuro">
                    {detalle.cantidad} × {detalle.productos?.nombre ?? 'Producto'} · {detalle.estado_sector === 'listo' ? 'Listo' : (detalle.estado_sector === 'en_preparacion' ? 'En preparación' : 'Pendiente')}
                  </Text>)}
                </ScrollView>
              </View>}
              {!!item.cuenta_solicitada_at && (
                <View className="mt-2 rounded-lg bg-chido-aviso px-3 py-2">
                  <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro" numberOfLines={1}>El cliente pidió la cuenta</Text>
                </View>
              )}
              
              <View className="mt-auto pt-2 flex-row justify-end items-center gap-3">
                {item.estado === 'pendiente_mozo' && (
                  <>
                    <TouchableOpacity 
                      className="bg-chido-exito border-2 border-white/70 px-2 py-2 rounded-xl flex-1 items-center justify-center"
                      style={{ minHeight: 48 }}
                      onPress={() => cambiarEstado(item.id, 'confirmado')}
                    >
                      <Text className="text-lg font-bold text-chido-texto-sobre-oscuro">Aceptar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="bg-chido-error border-2 border-white/70 px-2 py-2 rounded-xl flex-1 items-center justify-center"
                      style={{ minHeight: 48 }}
                      onPress={() => cambiarEstado(item.id, 'rechazado')}
                    >
                      <Text className="text-lg font-bold text-chido-texto-sobre-oscuro">Rechazar</Text>
                    </TouchableOpacity>
                  </>
                )}
                {item.estado === 'en_preparacion' && item.pedido_detalles?.length > 0 && item.pedido_detalles.every((detalle: { estado_sector: string }) => detalle.estado_sector === 'listo') && (
                  <TouchableOpacity 
                    className="w-full flex-row items-center justify-center rounded-xl border-2 border-chido-activo bg-chido-exito px-3 py-3"
                    style={{ minHeight: 52 }}
                    onPress={() => cambiarEntregado(item.id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={24} color={colores.textoSobreOscuro} />
                    <Text className="ml-2 text-center text-lg font-extrabold text-chido-texto-sobre-oscuro">Cocina y bar terminaron · Entregar</Text>
                  </TouchableOpacity>
                )}
                
                {/* Textos de tiempo para los estados sin botones */}
                {(item.estado === 'en_preparacion' && !item.pedido_detalles?.every((detalle: { estado_sector: string }) => detalle.estado_sector === 'listo') || item.estado === 'entregado' || item.estado === 'recibido' || item.estado === 'rechazado') && (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-center text-lg font-semibold text-chido-texto-secundario-sobre-oscuro" numberOfLines={1}>
                      {item.estado === 'en_preparacion' && 'Esperando que cocina y bar terminen.'}
                      {item.estado === 'entregado' && `Finalizado - Pedido de las ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      {item.estado === 'recibido' && 'El cliente confirmó la recepción.'}
                      {item.estado === 'rechazado' && `Cancelado - Pedido de las ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}}
        />
        {pedidosFiltrados.length > 0 && <View style={[styles.paginacion, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.resumen} accessibilityLiveRegion="polite">
            Pedidos {inicio + 1}–{inicio + pedidosVisibles.length} de {pedidosFiltrados.length} · Página {paginaActual + 1} de {totalPaginas}
          </Text>
          <View style={styles.botones}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Página anterior de pedidos"
              accessibilityState={{ disabled: paginaActual === 0 }}
              disabled={paginaActual === 0}
              onPress={() => setPagina(Math.max(0, paginaActual - 1))}
              activeOpacity={0.8}
              style={[styles.boton, paginaActual === 0 && styles.deshabilitado]}
            ><Text style={styles.textoBoton}>‹ Anterior</Text></TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Página siguiente de pedidos"
              accessibilityState={{ disabled: paginaActual === totalPaginas - 1 }}
              disabled={paginaActual === totalPaginas - 1}
              onPress={() => setPagina(Math.min(totalPaginas - 1, paginaActual + 1))}
              activeOpacity={0.8}
              style={[styles.boton, paginaActual === totalPaginas - 1 && styles.deshabilitado]}
            ><Text style={styles.textoBoton}>Siguiente ›</Text></TouchableOpacity>
          </View>
        </View>}
        </View>
      )}
      <ResultadoModal
        visible={Boolean(aviso)}
        tipo={aviso?.tipo ?? 'error'}
        titulo={aviso?.titulo ?? ''}
        mensaje={aviso?.mensaje ?? ''}
        accion="Entendido"
        onClose={() => setAviso(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { flex: 1 },
  lista: { flex: 1 },
  paginacion: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colores.fondo, borderTopWidth: 1, borderTopColor: colores.textoSecundarioAlternativo },
  resumen: { color: colores.textoSobreOscuro, fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  botones: { flexDirection: 'row', gap: 12 },
  boton: { flex: 1, minHeight: 56, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colores.textoSecundarioAlternativo, backgroundColor: colores.cabecera, alignItems: 'center', justifyContent: 'center' },
  textoBoton: { color: colores.textoSobreOscuro, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  deshabilitado: { opacity: 0.4 },
});
