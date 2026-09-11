import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { componerCorreo, type CorreoRegistro } from '../_shared/correos.ts';

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const webhookSecret = Deno.env.get('CHIDO_CORREOS_SECRET');
  if (!webhookSecret || request.headers.get('x-chido-secret') !== webhookSecret) return new Response(null, { status: 401 });
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const remitente = Deno.env.get('CHIDO_EMAIL_FROM');
  const logo = Deno.env.get('CHIDO_LOGO_URL');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // Sin configuración no se consumen intentos ni se informa que el mensaje fue enviado.
  if (!apiKey || !remitente || !logo || !url || !serviceKey) return Response.json({ error: 'Falta configurar el correo empresarial.' }, { status: 503 });
  try {
    if (new URL(logo).protocol !== 'https:') throw new Error('LOGO');
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc('chido_tomar_correos');
    if (error) throw error;
    let enviados = 0;
    for (const correo of (data ?? []) as CorreoRegistro[]) {
      try {
        const contenido = componerCorreo(correo, logo);
        const respuesta = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `registro/${correo.id}` },
          body: JSON.stringify({ from: remitente, to: [correo.correo], ...contenido }),
          signal: AbortSignal.timeout(15000),
        });
        if (!respuesta.ok) throw new Error(`PROVEEDOR_${respuesta.status}`);
        const { error: guardado } = await admin.from('correos_registro').update({ enviado_at: new Date().toISOString(), ultimo_error: null, bloqueo: null }).eq('id', correo.id).eq('bloqueo', correo.bloqueo);
        if (guardado) throw new Error('CONFIRMACION_ENVIO');
        enviados++;
      } catch {
        const { error: reintentoError } = await admin.from('correos_registro').update({
          ultimo_error: 'No se pudo confirmar el envío. Revisar proveedor/configuración.',
          proximo_intento: new Date(Date.now() + Math.min(60, 2 ** correo.intentos) * 60000).toISOString(),
          bloqueo: null,
        }).eq('id', correo.id).eq('bloqueo', correo.bloqueo);
        if (reintentoError) console.error('CORREO_REINTENTO_NO_CONFIRMADO');
      }
    }
    return Response.json({ enviados });
  } catch {
    console.error('CORREOS_FALLO_INTERNO');
    return Response.json({ error: 'No se pudo procesar la cola de correos.' }, { status: 500 });
  }
});
