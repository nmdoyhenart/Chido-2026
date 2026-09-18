import { supabase } from './supabase';
export type ResultadoEncuesta = {
    id: string;
    fecha: string;
    promedio: number;
    // el resto se define cuando esten definidas las encuestas
};

export async function obtenerResultadosEncuestas(): Promise<ResultadoEncuesta[]> {
    // despues reemplazar por datos reales de encuesta
    return [];
}