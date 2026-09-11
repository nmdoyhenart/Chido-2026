import { supabase } from './supabase'; 
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export type TipoProducto = 'plato' | 'bebida';

type NuevoProducto = {
    nombre: string;
    descripcion: string;
    tiempo_elaboracion: number;
    precio: number;
    fotos: string[];
    tipo: TipoProducto;
};

export async function crearProducto(datos:NuevoProducto) {
    const {data, error } = await supabase
    .from('productos')
    .insert(datos)
    .select();

    if (error) {
        console.error('Error al crear el proyecto', error.message);
        throw error;
    }

    return data;
}

export async function subirFoto(uri: string, nombreArchivo: string) {
    console.log('URI de la foto:', uri);

    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    console.log('Longitud del base64:', base64.length);

    const arrayBuffer = decode(base64);
    console.log('Tamaño del arrayBuffer (bytes):', arrayBuffer.byteLength);

    const { error } = await supabase.storage
        .from('productos')
        .upload(nombreArchivo, arrayBuffer, { contentType: 'image/jpeg' });

    if (error) {
        console.error('Error al subir la foto', error.message);
        throw error;
    }

    const { data } = supabase.storage.from('productos').getPublicUrl(nombreArchivo);

    return data.publicUrl;
}
export async function subirFotos(fotos: (string | null)[]) {
    const urls: string[] = [];

    for (let i = 0; i < fotos.length; i++) {
        const uri = fotos[i];
        if (!uri) continue;

        const nombreArchivo = `producto-${Date.now()}-${i}.jpg`;
        const url = await subirFoto(uri, nombreArchivo);
        urls.push(url);
    }

    return urls;
}

export async function existeProducto(nombre: string) {
    const { data, error } = await supabase
        .from('productos')
        .select('id')
        .eq('nombre', nombre);

    if (error) {
        console.error('Error al verificar el nombre:', error.message);
        throw error;
    }

    return data.length > 0;
}