export const RUTAS_NOTIFICACION = {
    clientesPendientes: '/(app)/clientes-pendientes',
    listaEsperaMetre: '/metre/listaEspera',
    pedidosCliente: '/cliente/estado-pedido',
    mesaAsignadaCliente: '/cliente/espera-mesa',
    pedidosCocina: '/cocina/pedidos',
    pedidosBar: '/bar/pedidos',
    pedidosMozo: '/mozo/pedidos',
    mesasGestion: '/mesas/gestion',
    chatCliente: '/cliente/chat',
    chatMozo: '/mozo/chat-mesa',
} as const;

export type RutaNotificacion =
  | typeof RUTAS_NOTIFICACION[keyof typeof RUTAS_NOTIFICACION]
  | `/cliente/estado-pedido?pedidoId=${string}`
  | `/mozo/chat-mesa?mesaId=${string}&numero=${string}`
  | `/mozo/chat-mesa?mesaId=${string}`;

export type DestinatarioNotificacion = 'dueño' | 'supervisor' | 'metre' | 'mozo' | 'cocinero' | 'cantinero' | 'cliente registrado';
export type EventoNotificacion =
  | 'cliente_registrado'
  | 'cliente_en_espera'
  | 'mesa_asignada'
  | 'pedido_confirmado'
  | 'pedido_rechazado'
  | 'cuenta_solicitada'
  | 'nuevo_pedido'
  | 'pago_recibido'
  | 'pago_confirmado'
  | 'chat_mozo'
  | 'chat_cliente';

export type DatosNotificacionPush = {
  ruta?: RutaNotificacion | string;
  pedidoId?: string;
  mesaId?: string;
  numero?: string | number;
  evento?: EventoNotificacion | string;
  [key: string]: unknown;
};

export type NotificacionPush = {
    evento: EventoNotificacion;
    destinatarios: readonly DestinatarioNotificacion[];
    titulo: string;
    cuerpo: string;
    datos: DatosNotificacionPush;
};
