export type ResultadoEncuesta = {
    id: string;
    fecha: string;
    promedio: number;
    calificacionComida: number; // 1 a 5
    calificacionAtencion: number; // 1 a 5
    recomienda: boolean;
    // el resto se define cuando esten definidas las encuestas
};

export type ResumenEncuestas = {
    total: number;
    porcentajeRecomienda: number;
    promedioComida: number;
    promedioAtencion: number;
    recomiendan: number;
    noRecomiendan: number;
};

export function resumirEncuestas(resultados: ResultadoEncuesta[]): ResumenEncuestas {
    const total = resultados.length;
    const recomiendan = resultados.filter((r) => r.recomienda).length;
    const promedio = (valores: number[]) => (total > 0 ? valores.reduce((a, b) => a + b, 0) / total : 0);
    return {
        total,
        porcentajeRecomienda: total > 0 ? Math.round((recomiendan / total) * 100) : 0,
        promedioComida: promedio(resultados.map((r) => r.calificacionComida)),
        promedioAtencion: promedio(resultados.map((r) => r.calificacionAtencion)),
        recomiendan,
        noRecomiendan: total - recomiendan,
    };
}

export async function obtenerResultadosEncuestas(): Promise<ResultadoEncuesta[]> {
    const { data, error } = await supabase
        .from('encuestas_pedidos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching encuestas:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        fecha: row.created_at,
        promedio: (row.comida + row.atencion + row.experiencia) / 3,
        calificacionComida: row.comida,
        calificacionAtencion: row.atencion,
        recomienda: row.experiencia >= 4
    }));
}
