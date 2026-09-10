import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export async function subirFotoCliente(uri: string) {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const arrayBuffer = decode(base64);

    const nombreArchivo = `cliente-${Date.now()}.jpg`;

    const { error } = await supabase.storage
        .from('clientes')
        .upload(nombreArchivo, arrayBuffer, { contentType: 'image/jpeg' });

    if (error) {
        console.error('Error al subir la foto del cliente:', error.message);
        throw error;
    }

    const { data } = supabase.storage.from('clientes').getPublicUrl(nombreArchivo);

    return data.publicUrl;
}