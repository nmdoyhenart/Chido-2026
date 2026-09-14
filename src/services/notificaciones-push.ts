import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '../lib/supabase';
import type { DatosNotificacionPush } from '../types/notificaciones';

const CANAL_ANDROID = 'chido-avisos';
let registroEnCurso: Promise<boolean> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type RespuestaFuncion = { ok?: boolean; mensaje?: string };

async function invocarFuncion(nombre: 'registrar-dispositivo-push' | 'desvincular-dispositivo-push', body: { token: string }) {
  const { data: sesion, error: sesionError } = await supabase.auth.getSession();
  if (sesionError || !sesion.session) throw new Error('La sesión venció antes de registrar las notificaciones.');
  const { data, error } = await supabase.functions.invoke<RespuestaFuncion>(nombre, {
    body,
    headers: { Authorization: `Bearer ${sesion.session.access_token}` },
  });
  if (error || !data?.ok) throw new Error(data?.mensaje ?? 'No pudimos actualizar las notificaciones de este dispositivo.');
}

export async function configurarCanalNotificaciones() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Avisos de Chido',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 180, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function permisoNotificacionesConcedido() {
  if (Platform.OS !== 'android' || !Device.isDevice) return false;
  const permiso = await Notifications.getPermissionsAsync();
  return permiso.granted;
}

export async function solicitarPermisoNotificaciones() {
  if (Platform.OS !== 'android' || !Device.isDevice) return false;
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  const solicitado = await Notifications.requestPermissionsAsync();
  return solicitado.granted;
}

export async function obtenerTokenFirebase() {
  if (Platform.OS !== 'android' || !Device.isDevice) return null;
  const token = await Notifications.getDevicePushTokenAsync();
  return token.type === 'android' && typeof token.data === 'string' && token.data.length > 0 ? token.data : null;
}

export async function registrarDispositivoPush() {
  if (registroEnCurso) return registroEnCurso;
  registroEnCurso = (async () => {
    await configurarCanalNotificaciones();
    if (!(await permisoNotificacionesConcedido())) return false;
    const token = await obtenerTokenFirebase();
    if (!token) return false;
    await invocarFuncion('registrar-dispositivo-push', { token });
    return true;
  })();
  try {
    return await registroEnCurso;
  } finally {
    registroEnCurso = null;
  }
}

export async function desvincularDispositivoPush() {
  const token = await obtenerTokenFirebase();
  if (!token) return;
  await invocarFuncion('desvincular-dispositivo-push', { token });
}

export function escucharRespuestasPush(onDatos: (datos: DatosNotificacionPush) => void) {
  const procesar = (datos: unknown) => onDatos(datos as DatosNotificacionPush);
  const suscripcionRespuesta = Notifications.addNotificationResponseReceivedListener((respuesta) => {
    procesar(respuesta.notification.request.content.data);
  });
  const suscripcionToken = Notifications.addPushTokenListener(() => {
    void registrarDispositivoPush().catch(() => undefined);
  });
  void Notifications.getLastNotificationResponseAsync().then((respuesta) => {
    if (respuesta) procesar(respuesta.notification.request.content.data);
  }).catch(() => undefined);
  return () => {
    suscripcionRespuesta.remove();
    suscripcionToken.remove();
  };
}
