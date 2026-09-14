import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

const responder = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Content-Type': 'application/json' } });

function tokenValido(token: unknown): token is string {
  return typeof token === 'string' && token.length >= 20 && token.length <= 4096 && /^[A-Za-z0-9:_-]+$/.test(token);
}

function codigoSeguro(error: unknown) {
  if (!error || typeof error !== 'object') return 'DESCONOCIDO';
  const codigo = (error as { code?: unknown }).code;
  return typeof codigo === 'string' && /^[A-Z0-9_]+$/i.test(codigo) ? codigo : 'DESCONOCIDO';
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return responder({ ok: false, mensaje: 'Método no permitido.' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const claveServicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const jwt = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !claveServicio || !jwt) return responder({ ok: false, mensaje: 'No pudimos verificar la sesión.' }, 401);
  try {
    const admin = createClient(url, claveServicio, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identidad, error: identidadError } = await admin.auth.getUser(jwt);
    if (identidadError || !identidad.user) return responder({ ok: false, mensaje: 'La sesión venció. Volvé a ingresar.' }, 401);
    const body = await request.json().catch(() => null);
    if (!tokenValido(body?.token)) return responder({ ok: false, mensaje: 'El dispositivo no devolvió un identificador válido.' }, 400);
    const { data: usuario, error: usuarioError } = await admin.from('usuarios')
      .select('id, estado_registro')
      .eq('auth_id', identidad.user.id)
      .maybeSingle();
    if (usuarioError) throw usuarioError;
    if (!usuario || usuario.estado_registro !== 'aceptado') return responder({ ok: false, mensaje: 'La cuenta no está habilitada para recibir avisos.' }, 403);
    const ahora = new Date().toISOString();
    const { error } = await admin.from('dispositivos_push').upsert({
      usuario_id: usuario.id,
      token: body.token,
      plataforma: 'android',
      activo: true,
      actualizado_at: ahora,
      desactivado_at: null,
    }, { onConflict: 'token' });
    if (error) throw error;
    return responder({ ok: true });
  } catch (error) {
    console.error('REGISTRO_PUSH_FALLO', { codigo: codigoSeguro(error) });
    return responder({ ok: false, mensaje: 'No pudimos registrar este dispositivo.' }, 500);
  }
});
