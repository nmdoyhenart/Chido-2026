import { supabase } from './supabase'; 

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