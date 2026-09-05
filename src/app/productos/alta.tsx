import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { crearProducto, TipoProducto } from '../../../lib/productos';

export default function AltaPlato() {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [tiempoElaboracion, setTiempoElaboracion] = useState('');
    const [precio, setPrecio] = useState('');
    const [tipo, setTipo] = useState<TipoProducto>('plato');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    async function handleGuardar() {
        setError('');
        
        if(!nombre || !descripcion || !tiempoElaboracion || !precio) {
            setError('Completa todos los campos.');
            return;
        }
        
        setCargando(true);

        try {
            const nuevoProducto = {
                nombre: nombre,
                descripcion: descripcion,
                tiempo_elaboracion: Number(tiempoElaboracion),
                precio: Number(precio),
                fotos: ['f1', 'f2', 'f3'],
                tipo: tipo,
            };
            await crearProducto(nuevoProducto);
        } catch (err) {
            setError('No se pudo guardar el producto. Probá de nuevo.');
        } finally {
            setCargando(false)
        }
    }

    return (
        <View style = {styles.container}>
            <Text>Nombre</Text>
            <TextInput
                style = {styles.input}
                value={nombre}
                onChangeText={setNombre}
            />

            <Text> Descripción</Text>
            <TextInput
                style={styles.input}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
            />
            <Text>Tiempo de elaboración (minutos)</Text>
            <TextInput
                style={styles.input}
                value={tiempoElaboracion}
                onChangeText={setTiempoElaboracion}
                keyboardType="numeric"
            />

            <Text>Precio</Text>
            <TextInput
                style={styles.input}
                value={precio}
                onChangeText={setPrecio}
                keyboardType="numeric"
            />

            {error !== '' && <Text style={styles.error}>{error}</Text>}

            {cargando && <ActivityIndicator size="large" />}

            <Pressable style={styles.boton} onPress={handleGuardar}>

            <Text style={styles.botonTexto}>Guardar</Text>

            </Pressable>
        </View>
    );
    }

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2b2b2b',
        padding: 16,
        gap: 12,
    },
    input: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
    },
    error: {
        color: '#ff6b6b',
        fontWeight: 'bold',
    },
    boton: {
        backgroundColor: '#3478f6',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    botonTexto: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

