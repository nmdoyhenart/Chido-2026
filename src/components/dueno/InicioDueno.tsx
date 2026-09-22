import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import type { Usuario } from '../../../shared/acceso';
import ChidoLoader from '../ui/ChidoLoader';
import { useContadorPendientes } from '../../hooks/useContadorPendientes';
import { colores as chido } from '../../theme/colores';

type Props = {
  usuario: Pick<Usuario, 'nombres' | 'apellidos' | 'foto_perfil' | 'perfil'>;
  simulacion?: boolean;
  saliendo: boolean;
  error: string | null;
  onSalir: () => void;
  onPendientes: () => void;
};

// Inicio compartido por Dueño y Supervisor, también en los accesos rápidos.
const colores = {
  fondo: chido.fondo, cabecera: chido.cabecera, tarjeta: chido.cabecera + 'B3',
  borde: chido.textoSecundarioAlternativo, crema: chido.textoSobreOscuro, secundario: chido.textoSecundarioSobreOscuro,
  boton: chido.acento, coral: chido.notificacion, verde: chido.activo,
};

export default function InicioDueno({ usuario, simulacion = false, saliendo, error, onSalir, onPendientes }: Props) {
  const { total: pendientes, error: errorPendientes } = useContadorPendientes(simulacion);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const escala = Math.min(width / 393, 1.25);
  const [fotoFallida, setFotoFallida] = useState(false);
  const nombre = [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ');
  const primerNombre = usuario.nombres.trim().split(/\s+/)[0];
  const foto = !fotoFallida && /^https:\/\//i.test(usuario.foto_perfil)
    ? { uri: usuario.foto_perfil } : require('../../../assets/images/logo.png');
  const titulo = { fontSize: 20 * escala, lineHeight: 25 * escala };
  const tarjetas = [
    { titulo: 'Alta de empleado', icono: 'person-add-outline', abrir: () => router.push('/supervisor/agregar-empleado') },
    { titulo: 'Alta de mesa', icono: 'tablet-landscape-outline', abrir: () => router.push('/mesas/alta') },
    { titulo: 'Gestión de mesas', icono: 'grid-outline', detalle: 'Consultar disponibilidad', abrir: () => router.push('/mesas/gestion') },
    { titulo: 'Clientes pendientes', icono: 'people-outline', pendientes: true, abrir: onPendientes },
    { titulo: 'Gestionar la carta', icono: 'book-outline', abrir: () => router.push('/(app)/carta-admin') },
  ] satisfies { titulo: string; icono: keyof typeof Ionicons.glyphMap; detalle?: string; pendientes?: boolean; abrir: () => void }[];

  return <View style={styles.pantalla}>
    <StatusBar style="light" />
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.cabecera}>
      <View style={[styles.perfil, { paddingHorizontal: 20 * escala, paddingTop: 8 * escala, paddingBottom: 23 * escala, gap: 13 * escala }]}>
        <Image source={foto} onError={() => setFotoFallida(true)} accessibilityLabel={`Foto de ${nombre}`} style={{ width: 56 * escala, height: 56 * escala, borderRadius: 28 * escala, borderWidth: 2, borderColor: colores.boton }} />
        <View style={styles.identidad}>
          <Text numberOfLines={2} style={[styles.nombre, { fontSize: 22 * escala, lineHeight: 27 * escala }]}>{nombre}</Text>
          <View style={[styles.insignia, { marginTop: 8 * escala }]}>
            <View style={styles.puntoVerde} />
            <Text style={[styles.rol, { fontSize: 13 * escala }]}>{usuario.perfil === 'supervisor' ? 'Supervisor' : 'Dueño'}</Text>
          </View>
        </View>
        <View style={[styles.acciones, { gap: 10 * escala }]}>
          <TouchableOpacity activeOpacity={0.8} onPress={onPendientes} disabled={saliendo} accessibilityRole="button" accessibilityLabel="Ver solicitudes pendientes" style={[styles.botonRedondo, { width: 50 * escala, height: 50 * escala }]}>
            <Ionicons name="notifications-outline" size={26 * escala} color={colores.crema} />
            {pendientes !== null && pendientes > 0 && <View style={styles.puntoNotificacion} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={onSalir} disabled={saliendo} activeOpacity={0.65} accessibilityRole="button" accessibilityLabel="Cerrar sesión" style={[styles.botonRedondo, { width: 50 * escala, height: 50 * escala, opacity: saliendo ? 0.65 : 1 }]}>
            <Ionicons name="log-out-outline" size={26 * escala} color={colores.crema} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>

    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.contenido}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, padding: 20 * escala, paddingTop: 24 * escala }}>
        <Text style={[styles.saludo, { fontSize: 30 * escala, marginBottom: 24 * escala }]}>Hola, {primerNombre}</Text>
        {simulacion && <Text style={[styles.detalle, { marginBottom: 18 }]}>Modo demostración · Explorá las pantallas sin modificar datos.</Text>}
        {saliendo && <ChidoLoader mensaje="Cerrando sesión…" />}
        {!!error && <Text style={styles.error} accessibilityLiveRegion="assertive">{error}</Text>}
        {pendientes === null && !errorPendientes && <ChidoLoader mensaje="Consultando solicitudes…" />}
        {!!errorPendientes && <Text style={styles.error} accessibilityLiveRegion="polite">{errorPendientes}</Text>}

        <View style={styles.listaTarjetas}>
          {tarjetas.map(tarjeta => <TouchableOpacity
            key={tarjeta.titulo}
            onPress={tarjeta.abrir}
            disabled={saliendo}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={tarjeta.pendientes ? 'Clientes pendientes de aprobación: ' + (pendientes ?? 'cantidad no disponible') : tarjeta.titulo}
            style={[styles.tarjeta, { minHeight: 104 * escala, paddingHorizontal: 24 * escala, paddingVertical: 18 * escala, gap: 24 * escala }]}
          >
            <Ionicons name={tarjeta.icono} size={32 * escala} color={colores.crema} />
            <View style={styles.textos}>
              <Text style={[styles.titulo, titulo]}>{tarjeta.titulo}</Text>
              {tarjeta.detalle && <Text style={[styles.detalle, { fontSize: 14 * escala, marginTop: 6 * escala }]}>{tarjeta.detalle}</Text>}
            </View>
            {tarjeta.pendientes ? <View style={[styles.contador, { minWidth: 32 * escala, minHeight: 32 * escala, paddingHorizontal: 6 }]}>
              <Text style={[styles.numero, { fontSize: 17 * escala }]}>{pendientes ?? '—'}</Text>
            </View> : <Ionicons name="chevron-forward" size={24 * escala} color={colores.crema} />}
          </TouchableOpacity>)}
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
  saludo: { color: colores.crema, fontWeight: '700' },
  listaTarjetas: { flex: 1, gap: 16 },
  tarjeta: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colores.tarjeta, borderColor: colores.borde, borderWidth: 2, borderRadius: 16 },
  textos: { flex: 1, minWidth: 0 },
  titulo: { color: colores.crema, fontWeight: '800' },
  detalle: { color: colores.secundario, fontWeight: '500' },
  contador: { flexShrink: 0, borderRadius: 30, backgroundColor: colores.coral, alignItems: 'center', justifyContent: 'center' },
  numero: { color: colores.crema, fontWeight: '800' },
  error: { color: colores.crema, backgroundColor: chido.error, padding: 12, borderRadius: 12, marginBottom: 16, fontSize: 16 },
});
