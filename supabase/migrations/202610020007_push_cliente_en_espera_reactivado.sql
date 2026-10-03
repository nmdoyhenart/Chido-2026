-- Avisa a los metres cuando un cliente entra a la lista de espera.
-- El trigger original (creado a mano en Supabase) era solo AFTER INSERT, pero solicitarMesa
-- reutiliza la fila anterior del cliente y la vuelve a 'esperando' con un UPDATE,
-- así que desde la segunda vez el metre no recibía la push.

CREATE OR REPLACE FUNCTION private.chido_notificar_cliente_en_espera()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.estado = 'esperando'
     AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'esperando') THEN
    PERFORM private.chido_encolar_push_para_perfiles(
      'cliente_en_espera',
      'Nuevo cliente en espera',
      'Un cliente se anotó a la lista de espera.',
      jsonb_build_object('ruta', '/metre/listaEspera'),
      ARRAY['metre']::public.tipo_perfil[],
      -- La fila se reutiliza en cada visita, por eso se suma la fecha
      'cliente_en_espera:' || NEW.id::text || ':' || extract(epoch FROM clock_timestamp())::text
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.chido_notificar_cliente_en_espera() FROM PUBLIC;

DROP TRIGGER IF EXISTS chido_cliente_en_espera_push ON public.lista_espera;
CREATE TRIGGER chido_cliente_en_espera_push
AFTER INSERT OR UPDATE OF estado ON public.lista_espera
FOR EACH ROW EXECUTE FUNCTION private.chido_notificar_cliente_en_espera();
