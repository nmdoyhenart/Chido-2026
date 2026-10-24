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

export async function obtenerClienteEnListaPorId(identificador: string) {
    const { data, error } = await supabase
        .from('lista_espera')
        .select('*')
        .eq('identificador', identificador)
        .in('estado', ['esperando', 'asignado'])
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error al verificar el estado del cliente:', error.message);
        throw error;
    }

    return data && data.length > 0 ? data[0] : null;
}

export async function anotarseEnListaDeEspera({
    identificador,
    nombre,
    fotoUrl,
}: {
    identificador: string;
    nombre: string;
    fotoUrl: string;
}) {
    const { error } = await supabase.from('lista_espera').insert({
        identificador,
        nombre,
        foto_url: fotoUrl,
        tipo_cliente: 'anonimo',
        estado: 'esperando',
    });

    if (error) {
        console.error('Error al anotarse en la lista de espera:', error.message);
        throw error;
    }
}

export function suscribirseAMiEstado(identificador: string, alCambiar: (fila: any) => void) {
    // Nombre único: supabase reutiliza canales con el mismo nombre y no permite
    // agregar callbacks a uno que ya está suscrito.
    const canal = supabase
        .channel(`cliente-estado-${identificador}-${Date.now()}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'lista_espera',
                filter: `identificador=eq.${identificador}`,
            },
            (payload) => {
                alCambiar(payload.new);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(canal);
    };
}