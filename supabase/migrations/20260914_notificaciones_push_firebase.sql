CREATE TABLE public.dispositivos_push (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE CHECK (char_length(token) BETWEEN 20 AND 4096),
  plataforma text NOT NULL CHECK (plataforma = 'android'),
  activo boolean NOT NULL DEFAULT true,
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now(),
  desactivado_at timestamptz
);

CREATE INDEX dispositivos_push_usuario_activo_idx ON public.dispositivos_push(usuario_id) WHERE activo;

CREATE TABLE public.notificaciones_push (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  evento text NOT NULL CHECK (char_length(evento) BETWEEN 1 AND 80),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 120),
  cuerpo text NOT NULL CHECK (char_length(cuerpo) BETWEEN 1 AND 240),
  datos jsonb NOT NULL CHECK (jsonb_typeof(datos) = 'object'),
  clave_idempotencia text NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'descartado')),
  intentos integer NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  proximo_intento timestamptz NOT NULL DEFAULT now(),
  bloqueo uuid,
  bloqueado_at timestamptz,
  enviado_at timestamptz,
  ultimo_error text,
  creado_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notificaciones_push_pendientes_idx ON public.notificaciones_push(proximo_intento)
  WHERE estado = 'pendiente';

ALTER TABLE public.dispositivos_push ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones_push ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dispositivos_push, public.notificaciones_push FROM anon, authenticated;
GRANT ALL ON public.dispositivos_push, public.notificaciones_push TO service_role;

CREATE OR REPLACE FUNCTION private.chido_encolar_push_para_perfiles(
  p_evento text,
  p_titulo text,
  p_cuerpo text,
  p_datos jsonb,
  p_perfiles public.tipo_perfil[],
  p_clave_origen text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  INSERT INTO public.notificaciones_push (usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia)
  SELECT u.id, p_evento, p_titulo, p_cuerpo, p_datos, p_clave_origen || ':' || u.id::text
  FROM public.usuarios AS u
  WHERE u.perfil = ANY(p_perfiles)
    AND u.estado_registro = 'aceptado'
  ON CONFLICT (clave_idempotencia) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION private.chido_encolar_push_para_perfiles(text, text, text, jsonb, public.tipo_perfil[], text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.chido_notificar_cliente_registrado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.perfil = 'cliente registrado' AND NEW.estado_registro = 'pendiente' THEN
    PERFORM private.chido_encolar_push_para_perfiles(
      'cliente_registrado',
      'Nueva solicitud de registro',
      'Hay un cliente pendiente de aprobación.',
      jsonb_build_object('ruta', '/(app)/clientes-pendientes'),
      ARRAY['dueño', 'supervisor']::public.tipo_perfil[],
      'cliente_registrado:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chido_cliente_registrado_push ON public.usuarios;
CREATE TRIGGER chido_cliente_registrado_push
AFTER INSERT ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION private.chido_notificar_cliente_registrado();

CREATE OR REPLACE FUNCTION public.chido_tomar_notificaciones_push(p_limite integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  usuario_id uuid,
  evento text,
  titulo text,
  cuerpo text,
  datos jsonb,
  intentos integer,
  bloqueo uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH candidatas AS (
    SELECT n.id
    FROM public.notificaciones_push AS n
    WHERE n.estado = 'pendiente'
      AND n.proximo_intento <= now()
      AND n.intentos < 5
      AND (n.bloqueo IS NULL OR n.bloqueado_at < now() - interval '5 minutes')
    ORDER BY n.creado_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limite, 1), 100)
  )
  UPDATE public.notificaciones_push AS n
  SET bloqueo = gen_random_uuid(), bloqueado_at = now(), intentos = n.intentos + 1
  FROM candidatas AS c
  WHERE n.id = c.id
  RETURNING n.id, n.usuario_id, n.evento, n.titulo, n.cuerpo, n.datos, n.intentos, n.bloqueo;
$$;

REVOKE ALL ON FUNCTION public.chido_tomar_notificaciones_push(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chido_tomar_notificaciones_push(integer) TO service_role;

-- Requiere que Vault contenga chido_push_scheduler_secret con el mismo valor
-- configurado como CHIDO_PUSH_SECRET en la Edge Function. No guardar secretos aquí.
CREATE OR REPLACE FUNCTION private.chido_enviar_notificaciones_push()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  secreto_worker text;
BEGIN
  SELECT decrypted_secret INTO secreto_worker
  FROM vault.decrypted_secrets
  WHERE name = 'chido_push_scheduler_secret'
  LIMIT 1;

  IF secreto_worker IS NULL THEN
    RAISE EXCEPTION 'Falta el secreto del scheduler de notificaciones push en Vault.';
  END IF;

  RETURN net.http_post(
    url := 'https://gcmqomdaurvelucodnqt.supabase.co/functions/v1/enviar-notificaciones-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-chido-secret', secreto_worker),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
END;
$$;

REVOKE ALL ON FUNCTION private.chido_enviar_notificaciones_push() FROM PUBLIC;

DO $$
DECLARE
  job_existente bigint;
BEGIN
  SELECT jobid INTO job_existente FROM cron.job WHERE jobname = 'chido-enviar-notificaciones-push';
  IF job_existente IS NOT NULL THEN PERFORM cron.unschedule(job_existente); END IF;
  PERFORM cron.schedule('chido-enviar-notificaciones-push', '* * * * *', 'SELECT private.chido_enviar_notificaciones_push();');
END;
$$;
