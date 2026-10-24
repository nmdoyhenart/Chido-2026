import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../Header';
import { useAppSession } from '../../contexts/AppSessionContext';
import { getPedidosSector } from '../../services/pedidos.service';
import { colores } from '../../theme/colores';
import { supabase } from '../../lib/supabase';

type Props = {
  usuario?: { nombres?: string | null; apellidos?: string | null } | null;
  role?: string | null;
};

export default function InicioCocinero({ usuario, role }: Props) {
  const router = useRouter();
  const { mode } = useAppSession();
  const { width } = useWindowDimensions();
  const escala = Math.min(width / 393, 1.25);
  const [pedidos, setPedidos] = useState(0);

  const cargarPedidos = useCallback(async () => {
    try {
      setPedidos((await getPedidosSector('plato')).length);
    } catch (error) {
      console.warn('No se pudo actualizar el contador de pedidos de cocina.', error);
    }
  }, []);

  useEffect(() => {
    if (mode === 'simulation') {
      setPedidos(4);
      return;
    }
    cargarPedidos();
    const nombreCanal = `home_cocinero_pedidos_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(nombreCanal)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, cargarPedidos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_detalles' }, cargarPedidos)
      .subscribe();
    const intervalo = setInterval(cargarPedidos, 15000);
    return () => {
      clearInterval(intervalo);
      void supabase.removeChannel(channel);
    };
  }, [cargarPedidos, mode]);

  const nombre = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ').trim() || 'Cocinero';
  const saludo = usuario?.nombres?.trim().split(/\s+/)[0] || 'Cocinero';
  const etiquetaRol = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Cocinero';
  const [anchosTitulo, setAnchosTitulo] = useState<Record<string, number>>({});
  // Android parte las palabras que no entran en una línea; se achica la letra lo justo
  // para que la palabra más larga del título (ej. "preparación") entre completa.
  const tamanoTitulo = (titulo: string) => {
    const palabraMasLarga = Math.max(...titulo.split(' ').map(palabra => palabra.length));
    const ancho = anchosTitulo[titulo];
    const fontSize = ancho ? Math.min(32 * escala, ancho / (palabraMasLarga * 0.6)) : 32 * escala;
    return { fontSize, lineHeight: fontSize * 1.2 };
  };
  const opciones = [
    { titulo: 'Alta de plato', icono: 'restaurant-outline' as const, destino: '/productos/alta' as const },
    { titulo: 'Platos y postres en preparación', icono: 'file-tray-full-outline' as const, destino: '/cocina/pedidos' as const, cantidad: pedidos },
    { titulo: 'Carta de cocina', icono: 'book-outline' as const, destino: '/cocina/carta' as const },
  ];

  return (
    <View style={styles.pantalla}>
      <StatusBar style="light" />
      <Header userName={nombre} role={etiquetaRol} />
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.contenido}>
        <View style={{ flex: 1, padding: 20 * escala, paddingTop: 24 * escala }}>
        <Text style={[styles.saludo, { fontSize: 30 * escala, marginBottom: 24 * escala }]}>Hola, {saludo}</Text>
        {mode === 'simulation' && <Text style={[styles.detalle, { marginBottom: 18 * escala }]}>Modo demostración · Explorá las pantallas sin modificar datos.</Text>}
        <View style={[styles.listaTarjetas, { gap: 16 * escala }]}>
          {opciones.map(opcion => (
            <TouchableOpacity
              key={opcion.titulo}
              accessibilityRole="button"
              accessibilityLabel={opcion.titulo}
              activeOpacity={0.85}
              onPress={() => router.push(opcion.destino)}
              style={[styles.tarjeta, { paddingHorizontal: 24 * escala, paddingVertical: 18 * escala, gap: 24 * escala }]}
            >
              <Ionicons name={opcion.icono} size={48 * escala} color={colores.textoSobreOscuro} />
              <View
                style={styles.textos}
                onLayout={({ nativeEvent }) => {
                  const ancho = Math.round(nativeEvent.layout.width);
                  setAnchosTitulo(actual => (actual[opcion.titulo] === ancho ? actual : { ...actual, [opcion.titulo]: ancho }));
                }}
              >
                {/* Título grande que ocupa el ancho de la tarjeta sin cortar palabras. */}
                <Text style={[styles.titulo, tamanoTitulo(opcion.titulo)]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{opcion.titulo}</Text>
              </View>
              {typeof opcion.cantidad === 'number' ? (
                <View style={[styles.contador, { minWidth: 40 * escala, minHeight: 40 * escala, paddingHorizontal: 8 }]}>
                  <Text style={[styles.numero, { fontSize: 22 * escala }]}>{opcion.cantidad}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={32 * escala} color={colores.textoSobreOscuro} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const paleta = {
  fondo: colores.fondo,
  tarjeta: colores.cabecera + 'B3',
  borde: colores.textoSecundarioAlternativo,
  crema: colores.textoSobreOscuro,
  secundario: colores.textoSecundarioSobreOscuro,
  coral: colores.notificacion,
};

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: paleta.fondo },
  contenido: { flex: 1 },
  saludo: { color: paleta.crema, fontWeight: '700' },
  detalle: { color: paleta.secundario, fontSize: 14 },
  listaTarjetas: { flex: 1 },
  tarjeta: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: paleta.tarjeta, borderColor: paleta.borde, borderWidth: 2, borderRadius: 16 },
  textos: { flex: 1, minWidth: 0 },
  titulo: { color: paleta.crema, fontWeight: '800' },
  contador: { flexShrink: 0, borderRadius: 30, backgroundColor: paleta.coral, alignItems: 'center', justifyContent: 'center' },
  numero: { color: paleta.crema, fontWeight: '800' },
});
