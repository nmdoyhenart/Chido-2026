import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function responder(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { ...cors, 'Cache-Control': 'no-store' } });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return responder({ mensaje: 'Método no permitido.' }, 405);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return responder({ mensaje: 'La solicitud debe enviarse en formato JSON.' }, 415);
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!token) return responder({ mensaje: 'Tu sesión venció. Volvé a ingresar.' }, 401);
  if (!url || !serviceKey) return responder({ mensaje: 'La resolución de registros no está disponible.' }, 503);

  try {
    const cuerpo = await request.json() as unknown;
    const datos = typeof cuerpo === 'object' && cuerpo !== null && !Array.isArray(cuerpo)
      ? cuerpo as Record<string, unknown>
      : null;
    const clienteId = typeof datos?.clienteId === 'string' ? datos.clienteId : '';
    const estado = datos?.estado;
    if (!UUID.test(clienteId) || (estado !== 'aceptado' && estado !== 'rechazado')) {
      return responder({ mensaje: 'La decisión solicitada no es válida.' }, 400);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: autenticacion, error: authError } = await admin.auth.getUser(token);
    if (authError || !autenticacion.user) return responder({ mensaje: 'Tu sesión venció. Volvé a ingresar.' }, 401);

    const { data: responsable, error: responsableError } = await admin
      .from('usuarios')
      .select('perfil, estado_registro')
      .eq('auth_id', autenticacion.user.id)
      .maybeSingle();
    if (responsableError) throw responsableError;
    if (!responsable || !['dueño', 'supervisor'].includes(responsable.perfil) || responsable.estado_registro !== 'aceptado') {
      return responder({ mensaje: 'Tu perfil no está autorizado para resolver registros.' }, 403);
    }

    const { data: resuelto, error: resolucionError } = await admin
      .from('usuarios')
      .update({ estado_registro: estado })
      .eq('id', clienteId)
      .eq('perfil', 'cliente registrado')
      .eq('estado_registro', 'pendiente')
      .not('auth_id', 'is', null)
      .select('id')
      .maybeSingle();
    if (resolucionError) throw resolucionError;
    if (!resuelto) {
      return responder({ mensaje: 'La solicitud ya fue resuelta, fue eliminada o no existe.' }, 409);
    }

    // El trigger chido_correo_registro encola el aviso correspondiente.
    return responder({ ok: true, estado });
  } catch {
    console.error('RESOLVER_REGISTRO_FALLO');
    return responder({ mensaje: 'No se pudo resolver la solicitud. Actualizá la lista e intentá nuevamente.' }, 500);
  }
});
