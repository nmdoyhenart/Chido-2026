import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ClientePendiente } from '../../services/aprobacion-cliente.service';
import { colores } from '../../theme/colores';

type Props = {
  cliente: ClientePendiente;
  altura: number;
  deshabilitada: boolean;
  onAceptar: () => void;
  onRechazar: () => void;
  onErrorFoto: () => void;
};

// Fondos sólidos y estilos directos para conservar el contraste también con NativeWind.
const verde = '#28613e';
const rojo = '#700e22';

export function SolicitudClienteCard({ cliente, altura, deshabilitada, onAceptar, onRechazar, onErrorFoto }: Props) {
  const nombre = [cliente.nombres, cliente.apellidos].filter(Boolean).join(' ');
  const [altoDatos, setAltoDatos] = useState(0);
  const [altoContenido, setAltoContenido] = useState(0);
  return <View style={styles.tarjeta}>
    <View style={styles.estado}>
      <Feather name="clock" size={15} color={colores.textoSobreClaro} />
      <Text style={styles.textoEstado}>Pendiente de aprobación</Text>
    </View>
    <View style={styles.foto}>
      {cliente.fotoUrl ? <Image source={{ uri: cliente.fotoUrl }} style={styles.imagen} resizeMode="contain"
        accessibilityLabel={`Foto de ${nombre}`} onError={onErrorFoto} /> : <View style={styles.sinFoto}>
        <Feather name="user" size={44} color={colores.textoSecundarioSobreOscuro} />
        <Text style={styles.textoSinFoto}>Foto no disponible</Text>
      </View>}
    </View>
    <ScrollView style={[styles.datos, { maxHeight: Math.max(130, altura * 0.40) }]} contentContainerStyle={styles.contenidoDatos}
      onLayout={event => setAltoDatos(event.nativeEvent.layout.height)}
      onContentSizeChange={(_, alto) => setAltoContenido(alto)}
      scrollEnabled={altoContenido > altoDatos + 1}
      nestedScrollEnabled showsVerticalScrollIndicator bounces={false}>
      <Text accessibilityRole="header" style={styles.nombre}>{nombre}</Text>
      <View style={styles.detalle}>
        <View style={styles.iconoDetalle}><Feather name="credit-card" size={19} color={colores.textoSobreClaro} /></View>
        <View style={styles.textosDetalle}><Text style={styles.etiqueta}>Documento</Text><Text style={styles.valor}>{cliente.dni || 'Sin documento registrado'}</Text></View>
      </View>
      <View style={styles.detalle}>
        <View style={styles.iconoDetalle}><Feather name="mail" size={19} color={colores.textoSobreClaro} /></View>
        <View style={styles.textosDetalle}><Text style={styles.etiqueta}>Correo electrónico</Text><Text style={styles.valor}>{cliente.correo || 'Sin correo registrado'}</Text></View>
      </View>
    </ScrollView>
    <View style={styles.acciones}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Aceptar a ${nombre}`} disabled={deshabilitada}
        activeOpacity={0.8} onPress={onAceptar} style={[styles.boton, styles.botonEnFila, styles.aceptar, deshabilitada && styles.deshabilitado]}>
        <Feather name="check" size={20} color={colores.textoSobreOscuro} /><Text style={styles.textoBoton}>Aceptar</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Rechazar a ${nombre}`} disabled={deshabilitada}
        activeOpacity={0.8} onPress={onRechazar} style={[styles.boton, styles.botonEnFila, styles.rechazar, deshabilitada && styles.deshabilitado]}>
        <Feather name="x" size={20} color={colores.textoSobreOscuro} /><Text style={styles.textoBoton}>Rechazar</Text>
      </TouchableOpacity>
    </View>
  </View>;
}

export function ConfirmacionCliente({ cliente, estado, onConfirmar, onCancelar }: {
  cliente: ClientePendiente;
  estado: 'aceptado' | 'rechazado';
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const aceptar = estado === 'aceptado';
  return <View style={styles.modal} accessibilityViewIsModal>
    <View style={[styles.iconoModal, aceptar ? styles.aceptar : styles.rechazar]}>
      <Feather name={aceptar ? 'user-check' : 'user-x'} size={29} color={colores.textoSobreOscuro} />
    </View>
    <Text accessibilityRole="header" style={styles.tituloModal}>{aceptar ? 'Aceptar cliente' : 'Rechazar solicitud'}</Text>
    <View style={styles.personaModal}>
      <Feather name="user" size={21} color={colores.textoSobreOscuro} />
      <Text style={styles.nombreModal}>{cliente.nombres} {cliente.apellidos}</Text>
    </View>
    <Text style={styles.descripcionModal}>{aceptar
      ? 'Al aceptar, podrá ingresar a Chido con su correo y contraseña.'
      : 'El cliente no podrá ingresar. Su solicitud se quitará de los pendientes y quedará registrada como rechazada.'}</Text>
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={onConfirmar}
      style={[styles.boton, aceptar ? styles.aceptar : styles.rechazar]}>
      <Feather name={aceptar ? 'check' : 'x'} size={21} color={colores.textoSobreOscuro} />
      <Text style={styles.textoBoton}>{aceptar ? 'Confirmar solicitud' : 'Rechazar solicitud'}</Text>
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={onCancelar} style={[styles.boton, styles.cancelar]}>
      <Text style={styles.textoCancelar}>Volver a revisar</Text>
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  tarjeta: { flex: 1, backgroundColor: colores.superficieTerracota, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colores.bordeNaranja },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colores.superficieNaranja, paddingVertical: 10, paddingHorizontal: 16 },
  textoEstado: { color: colores.textoSobreClaro, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  foto: { flex: 1, minHeight: 85, backgroundColor: colores.cabecera, overflow: 'hidden' },
  imagen: { width: '100%', height: '100%' },
  sinFoto: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  textoSinFoto: { color: colores.textoSobreOscuro, fontSize: 15 },
  datos: { flexGrow: 0, flexShrink: 1 },
  contenidoDatos: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6, gap: 10 },
  nombre: { color: colores.textoSobreOscuro, fontSize: 24, lineHeight: 29, fontWeight: '800', marginBottom: 2 },
  detalle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconoDetalle: { width: 36, height: 36, borderRadius: 11, backgroundColor: colores.superficieNaranja, alignItems: 'center', justifyContent: 'center' },
  textosDetalle: { flex: 1, minWidth: 0, gap: 1 },
  etiqueta: { color: colores.textoSecundarioAlternativo, fontSize: 12, fontWeight: '600' },
  valor: { color: colores.textoSobreOscuro, fontSize: 16, lineHeight: 22 },
  acciones: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colores.bordeNaranja, marginTop: 6, backgroundColor: colores.cabecera },
  boton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 13, borderRadius: 14 },
  botonEnFila: { flex: 1 },
  aceptar: { backgroundColor: verde, borderWidth: 2, borderColor: '#ffb3ae' },
  rechazar: { backgroundColor: rojo, borderWidth: 2, borderColor: '#ffb3ae' },
  textoBoton: { color: colores.textoSobreOscuro, fontSize: 16, lineHeight: 21, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  deshabilitado: { opacity: 0.6 },
  modal: { backgroundColor: colores.superficieTerracota, borderRadius: 28, padding: 24, width: '100%', maxWidth: 430, alignSelf: 'center', borderWidth: 1, borderColor: colores.bordeNaranja },
  iconoModal: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  tituloModal: { color: colores.textoSobreOscuro, fontSize: 27, fontWeight: '800', marginBottom: 18 },
  personaModal: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colores.cabecera, borderRadius: 14, padding: 14, marginBottom: 18 },
  nombreModal: { flex: 1, color: colores.textoSobreOscuro, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  descripcionModal: { color: colores.textoSobreOscuro, fontSize: 17, lineHeight: 26, marginBottom: 24 },
  cancelar: { backgroundColor: colores.superficieNaranja, borderWidth: 1, borderColor: colores.bordeNaranja, marginTop: 12 },
  textoCancelar: { color: colores.textoSobreClaro, fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
