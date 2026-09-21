import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { supabase } from '../../../lib/supabase';
import { colores } from '../../theme/colores';
import { useAppSession } from '../../contexts/AppSessionContext';
import { getPedidosMozo, actualizarEstadoPedido } from '../../services/pedidos.service';

const ESTADOS = ['todos', 'pendiente_mozo', 'confirmado', 'en_preparacion', 'entregado', 'rechazado'];

const ITEM_HEIGHT = 120;
const ITEM_MARGIN = 12;
const LIST_PADDING = 16;
const PEDIDOS_POR_PAGINA = 3;

export default function PedidosMozo() {
  const insets = useSafeAreaInsets();
  const { usuario, role } = useAppSession();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('todos');
  const [pagina, setPagina] = useState(0);
  const [altoLista, setAltoLista] = useState(0);

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
    };
    cargarPedidos();
    const channel = supabase
      .channel('pedidos_mozo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        cargarPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await actualizarEstadoPedido(id, nuevoEstado);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el pedido.');
    }
  };

  const getStatusBgColor = (estado: string) => {
    switch (estado) {
      case 'pendiente_mozo': return 'bg-chido-aviso text-chido-texto-sobre-oscuro';
      case 'confirmado': return 'bg-chido-exito text-chido-texto-sobre-oscuro';
      case 'en_preparacion': return 'bg-chido-botonPrincipal text-chido-texto-sobre-oscuro';
      case 'entregado': return 'bg-chido-superficieTerracota text-white';
      case 'rechazado': return 'bg-chido-error text-chido-texto-sobre-oscuro';
      default: return 'bg-chido-superficieTerracota text-white';
    }
  };

  const pedidosFiltrados = pedidos.filter(p => filtro === 'todos' || p.estado === filtro);
  const totalPaginas = Math.max(1, Math.ceil(pedidosFiltrados.length / PEDIDOS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaActual * PEDIDOS_POR_PAGINA;
  const pedidosVisibles = pedidosFiltrados.slice(inicio, inicio + PEDIDOS_POR_PAGINA);
  // Siempre reserva tres lugares: la última página conserva las proporciones.
  const altoTarjeta = Math.max(ITEM_HEIGHT,
    (altoLista - LIST_PADDING * 2 - ITEM_MARGIN * (PEDIDOS_POR_PAGINA - 1)) / PEDIDOS_POR_PAGINA);

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
              <Text className="text-chido-texto-sobre-oscuro font-bold capitalize">
                {est.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
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
              style={{ minHeight: altoTarjeta, padding: 12 }}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-2">
                  <Text className="text-chido-texto-sobre-oscuro text-xl font-bold">
                    Mesa {item.mesas?.numero}
                  </Text>
                  <Text className="text-white text-base capitalize mt-1 font-semibold">
                    {item.mesas?.tipo} • {item.mesas?.cantidad_comensales} personas
                  </Text>
                </View>
                <View className="items-end" style={{ maxWidth: '48%', flexShrink: 1 }}>
                  <Text className="text-chido-texto-sobre-oscuro font-extrabold text-xl mb-1">${item.total}</Text>
                  <View className={`px-2 py-1 rounded-full border border-white/40 ${bgClass}`}>
                    <Text className={`font-bold text-xs text-center ${textClass}`}>
                      {item.estado.replaceAll('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View className="mt-auto pt-2 flex-row justify-end items-center gap-3">
                {item.estado === 'pendiente_mozo' && (
                  <>
                    <TouchableOpacity 
                      className="bg-chido-exito border-2 border-white/70 px-2 py-2 rounded-xl flex-1 items-center justify-center"
                      style={{ minHeight: 44 }}
                      onPress={() => cambiarEstado(item.id, 'confirmado')}
                    >
                      <Text className="text-chido-texto-sobre-oscuro font-bold text-base">Aceptar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="bg-chido-error border-2 border-white/70 px-2 py-2 rounded-xl flex-1 items-center justify-center"
                      style={{ minHeight: 44 }}
                      onPress={() => cambiarEstado(item.id, 'rechazado')}
                    >
                      <Text className="text-chido-texto-sobre-oscuro font-bold text-base">Rechazar</Text>
                    </TouchableOpacity>
                  </>
                )}
                {item.estado === 'confirmado' && (
                  <TouchableOpacity 
                    className="bg-chido-botonPrincipal border-2 border-white/70 px-3 py-2 rounded-xl w-full items-center justify-center"
                    style={{ minHeight: 44 }}
                    onPress={() => cambiarEstado(item.id, 'entregado')}
                  >
                    <Text className="text-chido-texto-sobre-oscuro font-bold text-base text-center">Marcar como Entregado</Text>
                  </TouchableOpacity>
                )}
                
                {/* Textos de tiempo para los estados sin botones */}
                {(item.estado === 'en_preparacion' || item.estado === 'entregado' || item.estado === 'rechazado') && (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-chido-texto-secundario-sobre-oscuro font-semibold text-sm text-center">
                      {item.estado === 'en_preparacion' && `En cocina - Ingresado a las ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      {item.estado === 'entregado' && `Finalizado - Pedido de las ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { flex: 1 },
  lista: { flex: 1 },
  paginacion: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colores.fondo, borderTopWidth: 1, borderTopColor: colores.textoSecundarioAlternativo },
  resumen: { color: colores.textoSobreOscuro, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  botones: { flexDirection: 'row', gap: 12 },
  boton: { flex: 1, minHeight: 48, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colores.textoSecundarioAlternativo, backgroundColor: colores.cabecera, alignItems: 'center', justifyContent: 'center' },
  textoBoton: { color: colores.textoSobreOscuro, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  deshabilitado: { opacity: 0.4 },
});

