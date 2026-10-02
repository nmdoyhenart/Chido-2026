import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

type CuentaFirebase = { project_id: string; client_email: string; private_key: string };
type NotificacionTomada = {
  id: string;
  usuario_id: string;
  evento: string;
  titulo: string;
  cuerpo: string;
  datos: Record<string, unknown>;
  intentos: number;
  bloqueo: string;
};

let accesoFirebase: { token: string; venceEn: number } | null = null;

function base64Url(datos: Uint8Array | string) {
  const texto = typeof datos === 'string' ? datos : String.fromCharCode(...datos);
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodificarCuenta(valor: string): CuentaFirebase {
  const binario = atob(valor);
  const texto = new TextDecoder().decode(Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0)));
  const cuenta = JSON.parse(texto) as Partial<CuentaFirebase>;
  if (!cuenta.project_id || !cuenta.client_email || !cuenta.private_key) throw new Error('FIREBASE_CUENTA_INVALIDA');
  return cuenta as CuentaFirebase;
}

async function tokenAccesoFirebase(cuenta: CuentaFirebase) {
  if (accesoFirebase && accesoFirebase.venceEn > Date.now() + 60_000) return accesoFirebase.token;
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: cuenta.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  }));
  const pem = cuenta.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const clave = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(pem), (caracter) => caracter.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', clave, new TextEncoder().encode(`${cabecera}.${payload}`)));
  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${cabecera}.${payload}.${base64Url(firma)}` }),
    signal: AbortSignal.timeout(15000),
  });
  if (!respuesta.ok) throw new Error('FIREBASE_AUTORIZACION');
  const datos = await respuesta.json() as { access_token?: string; expires_in?: number };
  if (!datos.access_token) throw new Error('FIREBASE_TOKEN_AUSENTE');
  accesoFirebase = { token: datos.access_token, venceEn: Date.now() + (datos.expires_in ?? 3600) * 1000 };
  return accesoFirebase.token;
}

function esTokenInvalido(estado: number, cuerpo: unknown) {
  const codigo = typeof cuerpo === 'object' && cuerpo && 'error' in cuerpo
    ? (cuerpo as { error?: { details?: Array<{ errorCode?: string }> } }).error?.details?.[0]?.errorCode
    : undefined;
  return (estado === 404 && codigo === 'UNREGISTERED') || codigo === 'SENDER_ID_MISMATCH';
}

async function marcarReintento(admin: ReturnType<typeof createClient>, aviso: NotificacionTomada, mensaje: string) {
  const demora = Math.min(60, 2 ** aviso.intentos) * 60_000;
  const { error } = await admin.from('notificaciones_push').update({
    ultimo_error: mensaje,
    proximo_intento: new Date(Date.now() + demora).toISOString(),
    bloqueo: null,
    bloqueado_at: null,
  }).eq('id', aviso.id).eq('bloqueo', aviso.bloqueo);
  if (error) console.error('PUSH_REINTENTO_NO_CONFIRMADO');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const secreto = Deno.env.get('CHIDO_PUSH_SECRET');
  const cuentaCodificada = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_BASE64');
  const url = Deno.env.get('SUPABASE_URL');
  const claveServicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secreto || request.headers.get('x-chido-secret') !== secreto) return new Response(null, { status: 401 });
  if (!cuentaCodificada || !url || !claveServicio) return Response.json({ error: 'Falta configurar Firebase.' }, { status: 503 });
  try {
    const cuenta = decodificarCuenta(cuentaCodificada);
    const admin = createClient(url, claveServicio, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc('chido_tomar_notificaciones_push', { p_limite: 50 });
    if (error) throw error;
    let enviadas = 0;
    for (const aviso of (data ?? []) as NotificacionTomada[]) {
      try {
        const { data: dispositivos, error: dispositivosError } = await admin.from('dispositivos_push')
          .select('id, token')
          .eq('usuario_id', aviso.usuario_id)
          .eq('activo', true);
        if (dispositivosError) throw dispositivosError;
        if (!dispositivos?.length) {
          await marcarReintento(admin, aviso, 'El destinatario todavía no tiene un dispositivo habilitado.');
          continue;
        }
        const tokenAcceso = await tokenAccesoFirebase(cuenta);
        let enviado = false;
        let temporal = false;
        for (const dispositivo of dispositivos) {
          const respuesta = await fetch(`https://fcm.googleapis.com/v1/projects/${cuenta.project_id}/messages:send`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokenAcceso}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: {
                token: dispositivo.token,
                notification: { title: aviso.titulo, body: aviso.cuerpo },
                data: { evento: aviso.evento, ...Object.fromEntries(Object.entries(aviso.datos).map(([clave, valor]) => [clave, String(valor)])) },
                android: {
                  priority: 'high',
                  notification: { channel_id: 'chido-avisos', notification_priority: 'PRIORITY_HIGH' },
                },
              },
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (respuesta.ok) {
            enviado = true;
            continue;
          }
          const cuerpoError = await respuesta.json().catch(() => null);
          if (esTokenInvalido(respuesta.status, cuerpoError)) {
            await admin.from('dispositivos_push').update({ activo: false, desactivado_at: new Date().toISOString() }).eq('id', dispositivo.id);
          } else {
            temporal = true;
          }
        }
        if (enviado) {
          const { error: guardado } = await admin.from('notificaciones_push').update({
            estado: 'enviado', enviado_at: new Date().toISOString(), ultimo_error: null, bloqueo: null, bloqueado_at: null,
          }).eq('id', aviso.id).eq('bloqueo', aviso.bloqueo);
          if (guardado) throw guardado;
          enviadas++;
        } else if (temporal) {
          await marcarReintento(admin, aviso, 'Firebase no confirmó el envío.');
        } else {
          await admin.from('notificaciones_push').update({
            estado: 'descartado', ultimo_error: 'No quedó un dispositivo válido para el destinatario.', bloqueo: null, bloqueado_at: null,
          }).eq('id', aviso.id).eq('bloqueo', aviso.bloqueo);
        }
      } catch {
        await marcarReintento(admin, aviso, 'No se pudo procesar el envío.');
      }
    }
    return Response.json({ enviadas });
  } catch {
    console.error('PUSH_FALLO_INTERNO');
    return Response.json({ error: 'No se pudo procesar la cola de notificaciones.' }, { status: 500 });
  }
});
