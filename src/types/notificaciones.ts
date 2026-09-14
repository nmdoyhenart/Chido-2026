export const RUTAS_NOTIFICACION = {
  clientesPendientes: '/(app)/clientes-pendientes',
} as const;

export type RutaNotificacion = typeof RUTAS_NOTIFICACION[keyof typeof RUTAS_NOTIFICACION];
export type DestinatarioNotificacion = 'dueño' | 'supervisor';
export type EventoNotificacion = 'cliente_registrado';

export type NotificacionPush = {
  evento: EventoNotificacion;
  destinatarios: readonly DestinatarioNotificacion[];
  titulo: string;
  cuerpo: string;
  datos: { ruta: RutaNotificacion };
};

export type DatosNotificacionPush = NotificacionPush['datos'];
