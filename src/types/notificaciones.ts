export const RUTAS_NOTIFICACION = {
    clientesPendientes: '/(app)/clientes-pendientes',
    listaEsperaMetre: '/metre/lista-espera',
} as const;

export type RutaNotificacion = typeof RUTAS_NOTIFICACION[keyof typeof RUTAS_NOTIFICACION];
export type DestinatarioNotificacion = 'dueño' | 'supervisor' | 'metre';
export type EventoNotificacion = 'cliente_registrado' | 'cliente_en_espera';

export type NotificacionPush = {
    evento: EventoNotificacion;
    destinatarios: readonly DestinatarioNotificacion[];
    titulo: string;
    cuerpo: string;
    datos: { ruta: RutaNotificacion };
};

export type DatosNotificacionPush = NotificacionPush['datos'];