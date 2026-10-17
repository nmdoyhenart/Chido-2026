-- Cada envio del cliente tiene una solicitud distinta. Al reenviar un pedido
-- rechazado se debe avisar otra vez al mozo sin repetir avisos del mismo envio.
CREATE OR REPLACE FUNCTION public.notificar_nuevo_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_mesa_numero integer;
  v_solicitud_id text;
BEGIN
  IF NEW.estado = 'pendiente_mozo'
    AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'pendiente_mozo') THEN
    SELECT numero INTO v_mesa_numero
    FROM public.mesas
    WHERE id = NEW.mesa_id;

    -- Los pedidos antiguos sin solicitud_id conservan una clave estable.
    v_solicitud_id := COALESCE(NEW.solicitud_id::text, NEW.id::text);

    INSERT INTO public.notificaciones_push (
      usuario_id,
      evento,
      titulo,
      cuerpo,
      datos,
      clave_idempotencia
    )
    SELECT
      mozo.id,
      'nuevo_pedido',
      'Nuevo pedido - Mesa ' || COALESCE(v_mesa_numero::text, '?'),
      'La mesa realizó un nuevo pedido.',
      jsonb_build_object('ruta', '/mozo/pedidos', 'pedidoId', NEW.id),
      'pedido:' || NEW.id::text || ':solicitud:' || v_solicitud_id || ':mozo:' || mozo.id::text
    FROM public.usuarios AS mozo
    WHERE mozo.perfil::text = 'mozo'
    ON CONFLICT (clave_idempotencia) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
