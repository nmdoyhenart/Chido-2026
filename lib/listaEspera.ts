import { supabase } from './supabase';

export type TipoCliente = 'anonimo' | 'registrado';
export type EstadoLista = 'esperando' | 'asignado' | 'eliminado';

export type ClienteEnEspera = {
    id:string;
    identificador: string;
    nombre:string,
    foto_url: string;
    tipo_cliente: string;
    estado: EstadoLista;
    mesa_id: string | null;
    created_at :string;
};

export async function obtenerListaEspera (): Promise<ClienteEnEspera[]> {
    const {data, error } = await supabase
    .from('lista_espera')
    .select('*')
    .eq('estado', 'esperando')
    .order('created_at', {ascending:true});

    if (error) {
        console.error ('Error al traer la lista de espera', error.message);
        throw error;
    }

    return data;
}

export function suscribirseALista(nombreCanal: string, alCambiar: () => void) {
    const canal = supabase
    .channel(nombreCanal)
    .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lista_espera' },
        alCambiar
    )
    .subscribe();

    return () => {
        supabase.removeChannel(canal);
    };
}
