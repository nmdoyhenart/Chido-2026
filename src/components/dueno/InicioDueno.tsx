import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Usuario } from '../../../shared/acceso';
import ChidoLoader from '../ui/ChidoLoader';
import { useContadorPendientes } from '../../hooks/useContadorPendientes';
import { colores as chido } from '../../theme/colores';

type Props = {
  usuario: Usuario;
  saliendo: boolean;
  error: string | null;
  onSalir: () => void;
  onPendientes: () => void;
};

// Paleta local mapeada 1:1 a src/theme/colores.ts (fuente única de verdad).
const colores = {
  fondo: chido.fondo, cabecera: chido.cabecera, tarjeta: chido.acento,
  borde: chido.acento, crema: chido.textoSobreOscuro, secundario: chido.textoSecundarioSobreOscuro,
  boton: chido.acento, coral: chido.notificacion, verde: chido.activo,
};

// Las solicitudes usan datos reales. Mesas, altas y carta conservan el mockup.
export default function InicioDueno({ usuario, saliendo, error, onSalir, onPendientes }: Props) {
  const { total: pendientes, error: errorPendientes } = useContadorPendientes();
  const { width } = useWindowDimensions();
  const escala = Math.min(width / 393, 1.25);
  const [fotoFallida, setFotoFallida] = useState(false);
  const nombre = [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ');
  const primerNombre = usuario.nombres.trim().split(/\s+/)[0];
  const foto = !fotoFallida && /^https:\/\//i.test(usuario.foto_perfil)
    ? { uri: usuario.foto_perfil } : require('../../../assets/images/logo.png');
  const titulo = { fontSize: 17 * escala, lineHeight: 21 * escala };
  const icono = (nombreIcono: keyof typeof Feather.glyphMap) => (
    <View style={[styles.icono, { width: 45 * escala, height: 45 * escala, borderRadius: 12 * escala }]}>
      <Feather name={nombreIcono} size={23 * escala} color={colores.crema} />
    </View>
  );

  return <View style={styles.pantalla}>
    <StatusBar style="dark" />
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.cabecera}>
      <View style={[styles.perfil, { paddingHorizontal: 20 * escala, paddingTop: 22 * escala, paddingBottom: 23 * escala, gap: 13 * escala }]}>
        <Image source={foto} onError={() => setFotoFallida(true)} accessibilityLabel={`Foto de ${nombre}`} style={{ width: 58 * escala, height: 58 * escala, borderRadius: 29 * escala }} />
        <View style={styles.identidad}>
          <Text numberOfLines={2} style={[styles.nombre, { fontSize: 17 * escala, lineHeight: 21 * escala }]}>{nombre}</Text>
          <View style={[styles.insignia, { marginTop: 8 * escala }]}>
            <View style={styles.puntoVerde} />
            <Text style={[styles.rol, { fontSize: 13 * escala }]}>{usuario.perfil === 'supervisor' ? 'Supervisor' : 'Dueño'}</Text>
          </View>
        </View>
        <View style={[styles.acciones, { gap: 10 * escala }]}>
          <Pressable onPress={onPendientes} disabled={saliendo} accessibilityRole="button" accessibilityLabel="Ver solicitudes pendientes" style={[styles.botonRedondo, { width: 45 * escala, height: 45 * escala }]}>
            <Feather name="bell" size={23 * escala} color={colores.crema} />
            {pendientes !== null && pendientes > 0 && <View style={styles.puntoNotificacion} />}
          </Pressable>
          <TouchableOpacity onPress={onSalir} disabled={saliendo} activeOpacity={0.65} accessibilityRole="button" accessibilityLabel="Cerrar sesión" style={[styles.botonRedondo, { width: 45 * escala, height: 45 * escala, opacity: saliendo ? 0.65 : 1 }]}>
            <Feather name="log-out" size={23 * escala} color={colores.crema} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>

    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.contenido}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 * escala, paddingTop: 25 * escala, paddingBottom: 30 * escala }}>
        <Text style={[styles.saludo, { fontSize: 27 * escala, marginBottom: 23 * escala }]}>Hola, {primerNombre}</Text>
        {saliendo && <ChidoLoader mensaje="Cerrando sesión…" />}
        {!!error && <Text style={styles.error} accessibilityLiveRegion="assertive">{error}</Text>}
        {pendientes === null && !errorPendientes && <ChidoLoader mensaje="Consultando solicitudes…" />}
        {!!errorPendientes && <Text style={styles.error} accessibilityLiveRegion="polite">{errorPendientes}</Text>}

        <View style={{ flexDirection: 'row', gap: 14 * escala, marginBottom: 22 * escala }}>
          <View accessible accessibilityRole="button" accessibilityLabel="Alta de empleado" accessibilityState={{ disabled: true }} style={[styles.tarjeta, styles.tarjetaAlta, { minHeight: 140 * escala, padding: 20 * escala }]}>
            {icono('user-plus')}
            <Text style={[styles.titulo, titulo, { marginTop: 14 * escala }]}>Alta de{ '\n' }empleado</Text>
          </View>
          <View accessible accessibilityRole="button" accessibilityLabel="Alta de mesa" accessibilityState={{ disabled: true }} style={[styles.tarjeta, styles.tarjetaAlta, { minHeight: 140 * escala, padding: 20 * escala }]}>
            <View style={[styles.icono, { width: 45 * escala, height: 45 * escala, borderRadius: 12 * escala }]}>
              <MaterialCommunityIcons name="table-furniture" size={24 * escala} color={colores.crema} />
            </View>
            <Text style={[styles.titulo, titulo, { marginTop: 14 * escala }]}>Alta de mesa</Text>
          </View>
        </View>

        <View accessible accessibilityRole="button" accessibilityLabel="Gestión de mesas. Datos de muestra: 12 mesas, 7 disponibles" accessibilityState={{ disabled: true }} style={[styles.tarjeta, styles.tarjetaFila, { minHeight: 124 * escala, padding: 20 * escala, gap: 14 * escala, marginBottom: 22 * escala }]}>
          {icono('layout')}
          <View style={styles.textos}>
            <Text style={[styles.titulo, titulo]}>Gestión de mesas</Text>
            <Text style={[styles.detalle, { fontSize: 14 * escala, marginTop: 7 * escala }]}>12 mesas · 7 disponibles</Text>
          </View>
          <Feather name="chevron-right" size={20 * escala} color={colores.secundario} />
        </View>

        <TouchableOpacity onPress={onPendientes} disabled={saliendo} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Clientes pendientes de aprobación: ${pendientes ?? 'cantidad no disponible'}`} style={[styles.tarjeta, styles.tarjetaFila, { minHeight: 124 * escala, padding: 20 * escala, gap: 14 * escala, marginBottom: 22 * escala }]}>
          {icono('users')}
          <View style={styles.textos}>
            <Text style={[styles.titulo, titulo]}>Clientes pendientes de aprobación</Text>
          </View>
          <View style={[styles.contador, { minWidth: 32 * escala, minHeight: 32 * escala, paddingHorizontal: 6, flexShrink: 0 }]}>
            <Text style={[styles.numero, { fontSize: 17 * escala }]}>{pendientes ?? '—'}</Text>
          </View>
        </TouchableOpacity>

        <View accessible accessibilityRole="button" accessibilityLabel="Ver la carta" accessibilityState={{ disabled: true }} style={[styles.tarjeta, styles.tarjetaFila, { minHeight: 124 * escala, padding: 20 * escala, gap: 14 * escala }]}>
          {icono('book')}
          <Text style={[styles.titulo, styles.textos, titulo]}>Ver la carta</Text>
          <Feather name="chevron-right" size={20 * escala} color={colores.secundario} />
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { backgroundColor: colores.cabecera },
  perfil: { flexDirection: 'row', alignItems: 'center' },
  identidad: { flex: 1, minWidth: 0 },
  nombre: { color: colores.crema, fontWeight: '800' },
  insignia: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: colores.boton },
  puntoVerde: { width: 7, height: 7, borderRadius: 4, backgroundColor: colores.verde },
  rol: { color: colores.secundario, fontWeight: '700' },
  acciones: { flexDirection: 'row', alignItems: 'center' },
  botonRedondo: { alignItems: 'center', justifyContent: 'center', backgroundColor: colores.boton, borderRadius: 50 },
  puntoNotificacion: { position: 'absolute', top: 7, right: 8, width: 11, height: 11, borderRadius: 6, backgroundColor: colores.coral, borderWidth: 1, borderColor: colores.cabecera },
  contenido: { flex: 1 },
  saludo: { color: colores.crema, fontWeight: '700', fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) },
  tarjeta: { backgroundColor: colores.tarjeta, borderColor: colores.borde, borderWidth: 1, borderRadius: 16 },
  tarjetaAlta: { flex: 1, justifyContent: 'center' },
  tarjetaFila: { flexDirection: 'row', alignItems: 'center' },
  icono: { backgroundColor: colores.cabecera, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  titulo: { color: colores.crema, fontWeight: '800' },
  detalle: { color: colores.secundario, fontWeight: '500' },
  contador: { borderRadius: 30, backgroundColor: colores.coral, alignItems: 'center', justifyContent: 'center' },
  numero: { color: colores.crema, fontWeight: '800' },
  error: { color: colores.crema, backgroundColor: chido.error, padding: 12, borderRadius: 12, marginBottom: 16, fontSize: 16 },
});
