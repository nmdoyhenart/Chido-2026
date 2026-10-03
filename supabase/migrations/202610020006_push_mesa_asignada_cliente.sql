-- Avisa por push al cliente registrado cuando el metre le asigna una mesa.
-- Ejecutar después de 202610020002_lista_espera_clientes_registrados.sql.
-- Los clientes anónimos no tienen usuario_id, así que no reciben push: su pantalla se actualiza sola.

CREATE OR REPLACE FUNCTION private.chido_notificar_mesa_asignada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_numero_mesa integer;
BEGIN
  IF NEW.estado = 'asignado'
     AND OLD.estado IS DISTINCT FROM 'asignado'
     AND NEW.usuario_id IS NOT NULL
     AND NEW.mesa_id IS NOT NULL THEN
    SELECT numero INTO v_numero_mesa FROM public.mesas WHERE id = NEW.mesa_id;

    INSERT INTO public.notificaciones_push (usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia)
    VALUES (
      NEW.usuario_id,
      'mesa_asignada',
      'Tu mesa está lista',
      'El metre te asignó la mesa ' || COALESCE(v_numero_mesa::text, '') || '. Escaneá su código QR para ingresar.',
      jsonb_build_object('ruta', '/cliente/espera-mesa'),
      -- La misma fila de lista_espera se reutiliza si el cliente vuelve a pedir mesa, por eso se suma la fecha
      'mesa_asignada:' || NEW.id::text || ':' || NEW.mesa_id::text || ':' || extract(epoch FROM clock_timestamp())::text
    )
    ON CONFLICT (clave_idempotencia) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.chido_notificar_mesa_asignada() FROM PUBLIC;

DROP TRIGGER IF EXISTS chido_mesa_asignada_push ON public.lista_espera;
CREATE TRIGGER chido_mesa_asignada_push
AFTER UPDATE OF estado ON public.lista_espera
FOR EACH ROW EXECUTE FUNCTION private.chido_notificar_mesa_asignada();
