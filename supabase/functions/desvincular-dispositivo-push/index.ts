import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

const responder = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return responder({ ok: false, mensaje: 'Método no permitido.' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const claveServicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const jwt = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !claveServicio || !jwt) return responder({ ok: false, mensaje: 'No pudimos verificar la sesión.' }, 401);
  try {
    const body = await request.json().catch(() => null);
    if (typeof body?.token !== 'string' || body.token.length > 4096) return responder({ ok: false, mensaje: 'El dispositivo no devolvió un identificador válido.' }, 400);
    const admin = createClient(url, claveServicio, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identidad, error: identidadError } = await admin.auth.getUser(jwt);
    if (identidadError || !identidad.user) return responder({ ok: false, mensaje: 'La sesión venció. Volvé a ingresar.' }, 401);
    const { data: usuario, error: usuarioError } = await admin.from('usuarios').select('id').eq('auth_id', identidad.user.id).maybeSingle();
    if (usuarioError) throw usuarioError;
    if (!usuario) return responder({ ok: true });
    const { error } = await admin.from('dispositivos_push').update({ activo: false, desactivado_at: new Date().toISOString() })
      .eq('usuario_id', usuario.id).eq('token', body.token);
    if (error) throw error;
    return responder({ ok: true });
  } catch {
    console.error('DESVINCULAR_PUSH_FALLO');
    return responder({ ok: false, mensaje: 'No pudimos desvincular este dispositivo.' }, 500);
  }
});
