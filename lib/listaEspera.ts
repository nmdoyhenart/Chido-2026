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
    const { error } = await supabase
    .from('lista_espera')
    .update({ estado: 'eliminado' })
    .eq('id', id);

    if (error) {
    console.error('Error al eliminar de la lista de espera:', error.message);
    throw error;
    }
}


export async function asignarMesaACliente(cliente: ClienteEnEspera, mesaId: string): Promise<void> {
    const actualizacionMesa: { disponibilidad: 'ocupada'; cliente_id?: string } = {
        disponibilidad: 'ocupada',
    };

    if (cliente.tipo_cliente === 'registrado') {
        actualizacionMesa.cliente_id = cliente.identificador;
    }

    const { data: mesaActualizada, error: errorMesa } = await supabase
        .from('mesas')
        .update(actualizacionMesa)
        .eq('id', mesaId)
        .eq('disponibilidad', 'vacía')
        .select('id')
        .maybeSingle();

    if (errorMesa) {
        console.error('Error al asignar la mesa:', errorMesa.message);
        throw errorMesa;
    }

    if (!mesaActualizada) {
        throw new Error('La mesa ya no está disponible.');
    }

    const { error: errorListaEspera } = await supabase
        .from('lista_espera')
        .update({ mesa_id: mesaId, estado: 'asignado' })
        .eq('id', cliente.id)
        .eq('estado', 'esperando');

    if (errorListaEspera) {
        console.error('Error al marcar al cliente como asignado:', errorListaEspera.message);
        throw errorListaEspera;
    }
}