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
<<<<<<< HEAD
    const { data, error } = await supabase.rpc('obtener_lista_espera_metre');
=======
    const {data, error } = await supabase
    .from('lista_espera')
    .select('*')
    .eq('estado', 'esperando')
    .order('created_at', {ascending:false});
>>>>>>> silvina

    if (error) {
        console.error ('Error al traer la lista de espera', error.message);
        throw error;
    }

    return (data ?? []) as ClienteEnEspera[];
}

export function suscribirseALista(nombreCanal: string, alCambiar: () => void) {
    const existente = supabase.getChannels().find((canal) => canal.topic === `realtime:${nombreCanal}`);
    if (existente) {
        supabase.removeChannel(existente);
    }

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

export async function eliminarDeLista(id: string) {
    const { error } = await supabase.rpc('eliminar_de_lista_espera_metre', { p_lista_id: id });

    if (error) {
    console.error('Error al eliminar de la lista de espera:', error.message);
    throw error;
    }
}


export async function asignarMesaACliente(cliente: ClienteEnEspera, mesaId: string): Promise<void> {
    const { error } = await supabase.rpc('asignar_mesa_lista_espera', {
        p_lista_id: cliente.id,
        p_mesa_id: mesaId,
    });
    if (error) {
        console.error('Error al asignar la mesa:', error.message);
        throw error;
    }
}
