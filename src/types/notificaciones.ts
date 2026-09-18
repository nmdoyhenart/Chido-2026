export const RUTAS_NOTIFICACION = {
  clientesPendientes: '/(app)/clientes-pendientes',
  mozoChats: '/mozo/chats',
  mozoChatMesa: '/mozo/chat-mesa',
  mozoPedidos: '/mozo/pedidos',
  clienteChat: '/cliente/chat',
} as const;

export type RutaNotificacion = typeof RUTAS_NOTIFICACION[keyof typeof RUTAS_NOTIFICACION];
export type DestinatarioNotificacion = 'dueño' | 'supervisor' | 'mozo' | 'cliente';
export type EventoNotificacion = 'cliente_registrado' | 'nuevo_pedido' | 'chat_mozo' | 'chat_cliente';

export type NotificacionPush = {
  evento: EventoNotificacion;
  destinatarios: readonly DestinatarioNotificacion[];
  titulo: string;
  cuerpo: string;
  datos: { ruta: RutaNotificacion };
};

export type DatosNotificacionPush = NotificacionPush['datos'];
