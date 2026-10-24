import type { Href } from 'expo-router';
import type { NotificacionPush, RutaNotificacion } from '../types/notificaciones';

const RUTA_CLIENTES_PENDIENTES: RutaNotificacion = '/(app)/clientes-pendientes';
const RUTA_LISTA_ESPERA_METRE: RutaNotificacion = '/metre/listaEspera';
const RUTA_PEDIDOS_CLIENTE: RutaNotificacion = '/cliente/estado-pedido';
const RUTA_MESA_ASIGNADA_CLIENTE: RutaNotificacion = '/cliente/espera-mesa';
const RUTA_PEDIDOS_MOZO: RutaNotificacion = '/mozo/pedidos';
const RUTA_CHAT_CLIENTE: RutaNotificacion = '/cliente/chat';
const RUTA_CHAT_MOZO: RutaNotificacion = '/mozo/chat-mesa';

const RUTAS_VALIDAS = new Set<string>([
  RUTA_CLIENTES_PENDIENTES,
  RUTA_LISTA_ESPERA_METRE,
  RUTA_PEDIDOS_CLIENTE,
  RUTA_MESA_ASIGNADA_CLIENTE,
  '/cocina/pedidos',
  '/bar/pedidos',
  RUTA_PEDIDOS_MOZO,
  '/mesas/gestion',
  RUTA_CHAT_CLIENTE,
  RUTA_CHAT_MOZO,
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
  const payload = datos as Record<string, unknown>;

  let rutaCompleta = typeof payload.ruta === 'string' ? payload.ruta : '';
  if (!rutaCompleta) {
    if (payload.evento === 'chat_cliente') {
      rutaCompleta = RUTA_CHAT_CLIENTE;
    } else if (payload.evento === 'chat_mozo') {
      rutaCompleta = RUTA_CHAT_MOZO;
    }
  }

  if (!rutaCompleta || !rutaCompleta.startsWith('/')) return null;

  const [baseRuta, queryString] = rutaCompleta.split('?');
  if (!RUTAS_VALIDAS.has(baseRuta)) return null;

  if (baseRuta === RUTA_PEDIDOS_CLIENTE) {
    let pedidoId = payload.pedidoId;
    if (!pedidoId && queryString) {
      const match = queryString.match(/(?:^|&)pedidoId=([^&]+)/);
      if (match) pedidoId = decodeURIComponent(match[1]);
    }
    if (
      typeof pedidoId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pedidoId)
    ) {
      return null;
    }
    return `${baseRuta}?pedidoId=${pedidoId}` as RutaNotificacion;
  }

  if (baseRuta === RUTA_CHAT_MOZO) {
    let mesaId = payload.mesaId;
    let numero = payload.numero;

    if (queryString) {
      const matchMesa = queryString.match(/(?:^|&)mesaId=([^&]+)/);
      if (matchMesa && !mesaId) mesaId = decodeURIComponent(matchMesa[1]);

      const matchNum = queryString.match(/(?:^|&)numero=([^&]+)/);
      if (matchNum && !numero) numero = decodeURIComponent(matchNum[1]);
    }

    if (typeof mesaId === 'string' && mesaId.length > 0) {
      const numStr =
        numero !== undefined && numero !== null && String(numero).length > 0
          ? `&numero=${encodeURIComponent(String(numero))}`
          : '';
      return `${baseRuta}?mesaId=${encodeURIComponent(mesaId)}${numStr}` as RutaNotificacion;
    }
    return baseRuta as RutaNotificacion;
  }

  if (baseRuta === RUTA_CHAT_CLIENTE) {
    return RUTA_CHAT_CLIENTE;
  }

  return baseRuta as RutaNotificacion;
}
