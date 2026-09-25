import type { Href } from 'expo-router';
import type { NotificacionPush, RutaNotificacion } from '../types/notificaciones';

const RUTA_CLIENTES_PENDIENTES: RutaNotificacion = '/(app)/clientes-pendientes';
const RUTA_LISTA_ESPERA_METRE: RutaNotificacion = '/metre/listaEspera';

const RUTAS_VALIDAS = new Set<string>([
  '/(app)/clientes-pendientes',
  '/mozo/chats',
  '/mozo/pedidos',
  '/cliente/chat',
  '/mozo/chat-mesa'
]);

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
    const data = datos as Record<string, unknown>;
  const ruta = data.ruta;
    
  if (typeof ruta === 'string' && RUTAS_VALIDAS.has(ruta)) {
    // If the notification includes extra data like mesaId, we pass it as query params
    if (ruta === '/mozo/chat-mesa' || ruta === '/cliente/chat') {
      return { pathname: ruta as any, params: data as any };
    }
    return ruta as Href;
  }
  return null;
}