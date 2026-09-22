import type { NotificacionPush, RutaNotificacion } from '../types/notificaciones';

const RUTA_CLIENTES_PENDIENTES: RutaNotificacion = '/(app)/clientes-pendientes';
const RUTA_LISTA_ESPERA_METRE: RutaNotificacion = '/metre/lista-espera';
const RUTAS_VALIDAS = new Set<string>([RUTA_CLIENTES_PENDIENTES, RUTA_LISTA_ESPERA_METRE]);

export function crearAvisoClienteRegistrado(): NotificacionPush {
    return {
        evento: 'cliente_registrado',
        destinatarios: ['dueño', 'supervisor'],
        titulo: 'Nueva solicitud de registro',
        cuerpo: 'Hay un cliente pendiente de aprobación.',
        datos: { ruta: RUTA_CLIENTES_PENDIENTES },
    };
}

export function crearAvisoClienteEnEspera(): NotificacionPush {
    return {
        evento: 'cliente_en_espera',
        destinatarios: ['metre'],
        titulo: 'Nuevo cliente en espera',
        cuerpo: 'Un cliente se anotó a la lista de espera.',
        datos: { ruta: RUTA_LISTA_ESPERA_METRE },
    };
}

export function obtenerRutaNotificacion(datos: unknown): RutaNotificacion | null {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null;
    const ruta = (datos as Record<string, unknown>).ruta;
    return typeof ruta === 'string' && RUTAS_VALIDAS.has(ruta) ? ruta as RutaNotificacion : null;
}