import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '../lib/supabase';
import type { DatosNotificacionPush } from '../types/notificaciones';

const CANAL_ANDROID = 'chido-avisos';
let registroEnCurso: Promise<boolean> | null = null;
let moduloNotificaciones: typeof import('expo-notifications') | null | undefined;

function obtenerModuloNotificaciones() {
  if (moduloNotificaciones) return moduloNotificaciones;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    moduloNotificaciones = require('expo-notifications') as typeof import('expo-notifications');
    moduloNotificaciones.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return moduloNotificaciones;
  } catch {
    return null;
  }
}

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
  const notifications = obtenerModuloNotificaciones();
  if (!notifications || Platform.OS !== 'android') return;
  try {
    await notifications.setNotificationChannelAsync(CANAL_ANDROID, {
      name: 'Avisos de Chido',
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 180, 250],
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    // Canal opcional según versión de Android
  }
}

export async function permisoNotificacionesConcedido() {
  const notifications = obtenerModuloNotificaciones();
  if (!notifications || Platform.OS !== 'android') return false;
  try {
    const permiso = await notifications.getPermissionsAsync();
    return permiso.granted;
  } catch {
    return false;
  }
}

export async function solicitarPermisoNotificaciones() {
  const notifications = obtenerModuloNotificaciones();
  if (!notifications || Platform.OS !== 'android') return false;
  try {
    const actual = await notifications.getPermissionsAsync();
    if (actual.granted) return true;
    const solicitado = await notifications.requestPermissionsAsync();
    return solicitado.granted;
  } catch {
    return false;
  }
}

export async function obtenerTokenFirebase() {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  const notifications = obtenerModuloNotificaciones();
  if (!notifications || Platform.OS !== 'android' || !Device.isDevice) return null;
  try {
    const token = await notifications.getDevicePushTokenAsync();
    return token.type === 'android' && typeof token.data === 'string' && token.data.length > 0 ? token.data : null;
  } catch {
    return null;
  }
}

export async function dispararNotificacionLocal(
  titulo: string,
  cuerpo: string,
  datos?: DatosNotificacionPush,
) {
  const notifications = obtenerModuloNotificaciones();
  if (!notifications) return;
  try {
    await configurarCanalNotificaciones();
    await notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        data: datos ?? {},
        sound: true,
        vibrate: [0, 250, 180, 250],
      },
      trigger: null,
    });
  } catch (error) {
    console.log('Aviso al mostrar notificación local:', error);
  }
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
  const notifications = obtenerModuloNotificaciones();
  if (!notifications) return () => undefined;
  let ultimoIdProcesado: string | null = null;
  const procesar = (respuesta: unknown) => {
    const res = respuesta as { notification?: { request?: { identifier?: string; content?: { data?: unknown } } } } | null;
    const identifier = res?.notification?.request?.identifier;
    const data = res?.notification?.request?.content?.data;
    if (!data) return;

    if (identifier) {
      if (ultimoIdProcesado === identifier) return;
      ultimoIdProcesado = identifier;
    }
    onDatos(data as DatosNotificacionPush);
  };
  const suscripcionRespuesta = notifications.addNotificationResponseReceivedListener((respuesta) => {
    procesar(respuesta);
  });
  const suscripcionToken = notifications.addPushTokenListener(() => {
    void registrarDispositivoPush().catch(() => undefined);
  });
  void notifications.getLastNotificationResponseAsync().then((respuesta) => {
    if (respuesta) procesar(respuesta);
  }).catch(() => undefined);
  return () => {
    suscripcionRespuesta.remove();
    suscripcionToken.remove();
  };
}
