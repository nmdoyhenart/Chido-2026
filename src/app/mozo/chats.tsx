import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { getMesasMozo } from '../../services/mesas';
import { Mesa } from '../../types/mesa';
import { useAppSession } from '../../contexts/AppSessionContext';
import { colores } from '../../theme/colores';
import { EstadoVacio } from '../../components/ui/EstadoVacio';

const ITEM_HEIGHT = 140;
const ITEM_MARGIN = 16;
const LIST_PADDING = 20;
const MESAS_POR_PAGINA = 3;

export default function ListaChatsMozo() {
  const router = useRouter();
  const { usuario, role } = useAppSession();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [altoLista, setAltoLista] = useState(0);
  const insets = useSafeAreaInsets();
  const totalPaginas = Math.max(1, Math.ceil(mesas.length / MESAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaActual * MESAS_POR_PAGINA;
  const mesasVisibles = mesas.slice(inicio, inicio + MESAS_POR_PAGINA);
  // Mantiene el tamaño de una página de tres mesas aunque queden menos.
  // La altura mínima permite seguir scrolleando en pantallas pequeñas.
  const altoTarjeta = Math.max(ITEM_HEIGHT,
    (altoLista - LIST_PADDING * 2 - ITEM_MARGIN * (MESAS_POR_PAGINA - 1))
      / MESAS_POR_PAGINA);

  useEffect(() => {
    const fetchMesas = async () => {
      try {
        const data = await getMesasMozo();
        if (data) setMesas(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMesas();
  }, []);

  const userName = usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Mozo";
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Mozo";

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={userName} role={`${displayRole} - Consultas`} />
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.contenido}>
        <FlatList
          key={paginaActual}
          style={styles.lista}
          onLayout={({ nativeEvent }) => setAltoLista(nativeEvent.layout.height)}
          data={mesasVisibles}
          extraData={altoTarjeta}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: LIST_PADDING, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: ITEM_MARGIN }} />}
          showsVerticalScrollIndicator
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="p-5 bg-chido-cabecera border-2 border-white/70 rounded-2xl flex-row justify-between items-center"
              style={{ minHeight: altoTarjeta, gap: 12 }}
              accessibilityRole="button"
              accessibilityLabel={`Ver chat de la mesa ${item.numero}`}
              onPress={() => router.push({ pathname: '/mozo/chat-mesa', params: { mesaId: item.id, numero: item.numero } })}
            >
              <View className="flex-1">
                <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold mb-1">Mesa {item.numero}</Text>
                <Text className="text-chido-texto-secundario-sobre-oscuro text-base capitalize">
                  Tipo: {item.tipo} • {item.cantidad_comensales} comensales
                </Text>
                <View className="flex-row items-center mt-3">
                  <View className={`w-3 h-3 rounded-full mr-2 ${item.disponibilidad === 'ocupada' ? 'bg-chido-error' : 'bg-chido-exito'}`} />
                  <Text className="text-chido-texto-sobre-oscuro font-bold capitalize">{item.disponibilidad}</Text>
                </View>
              </View>
              <View className="bg-chido-acento p-3 rounded-xl border border-white/30">
                <Text className="text-chido-texto-sobre-oscuro font-bold">Ver Chat</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EstadoVacio />}
        />
        {mesas.length > 0 && <View style={[styles.paginacion, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.resumen} accessibilityLiveRegion="polite">
            Mesas {inicio + 1}–{inicio + mesasVisibles.length} de {mesas.length} · Página {paginaActual + 1} de {totalPaginas}
          </Text>
          <View style={styles.botones}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Página anterior de mesas"
              accessibilityState={{ disabled: paginaActual === 0 }}
              disabled={paginaActual === 0}
              onPress={() => setPagina(Math.max(0, paginaActual - 1))}
              style={[styles.boton, paginaActual === 0 && styles.deshabilitado]}
            ><Text style={styles.textoBoton}>‹ Anterior</Text></TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Página siguiente de mesas"
              accessibilityState={{ disabled: paginaActual === totalPaginas - 1 }}
              disabled={paginaActual === totalPaginas - 1}
              onPress={() => setPagina(Math.min(totalPaginas - 1, paginaActual + 1))}
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
