-- Requiere que Vault contenga el secreto llamado
-- chido_correos_scheduler_secret. No guardar su valor en este archivo.
CREATE OR REPLACE FUNCTION private.chido_enviar_correos_registro()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  secreto_worker text;
BEGIN
  SELECT decrypted_secret
  INTO secreto_worker
  FROM vault.decrypted_secrets
  WHERE name = 'chido_correos_scheduler_secret'
  LIMIT 1;

  IF secreto_worker IS NULL THEN
    RAISE EXCEPTION 'Falta el secreto del scheduler de correos en Vault.';
  END IF;

  RETURN net.http_post(
    url := 'https://gcmqomdaurvelucodnqt.supabase.co/functions/v1/enviar-correos-registro',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-chido-secret', secreto_worker
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
END;
$$;

REVOKE ALL ON FUNCTION private.chido_enviar_correos_registro() FROM PUBLIC;

DO $$
DECLARE
  job_existente bigint;
BEGIN
  SELECT jobid
  INTO job_existente
  FROM cron.job
  WHERE jobname = 'chido-enviar-correos-registro';

  IF job_existente IS NOT NULL THEN
    PERFORM cron.unschedule(job_existente);
  END IF;

  PERFORM cron.schedule(
    'chido-enviar-correos-registro',
    '* * * * *',
    'SELECT private.chido_enviar_correos_registro();'
  );
END;
$$;
