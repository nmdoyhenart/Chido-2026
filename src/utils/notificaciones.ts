import type { Href } from 'expo-router';
import type { NotificacionPush, RutaNotificacion } from '../types/notificaciones';

const RUTA_CLIENTES_PENDIENTES: RutaNotificacion = '/(app)/clientes-pendientes';
const RUTA_LISTA_ESPERA_METRE: RutaNotificacion = '/metre/listaEspera';
const RUTA_PEDIDOS_CLIENTE: RutaNotificacion = '/cliente/estado-pedido';
const RUTA_MESA_ASIGNADA_CLIENTE: RutaNotificacion = '/cliente/espera-mesa';
const RUTAS_VALIDAS = new Set<string>([RUTA_CLIENTES_PENDIENTES, RUTA_LISTA_ESPERA_METRE, RUTA_PEDIDOS_CLIENTE, RUTA_MESA_ASIGNADA_CLIENTE, '/cocina/pedidos', '/bar/pedidos']);

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

export function obtenerRutaNotificacion(datos: unknown): Href | null {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null;
    const ruta = (datos as Record<string, unknown>).ruta;
    if (typeof ruta !== 'string' || !RUTAS_VALIDAS.has(ruta)) return null;
    if (ruta === RUTA_PEDIDOS_CLIENTE) {
        const pedidoId = (datos as Record<string, unknown>).pedidoId;
        if (typeof pedidoId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pedidoId)) return null;
        return `${ruta}?pedidoId=${pedidoId}` as RutaNotificacion;
    }
    return ruta as RutaNotificacion;
}
