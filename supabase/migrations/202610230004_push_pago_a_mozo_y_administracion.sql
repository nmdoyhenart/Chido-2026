-- Punto 21: cuando el cliente informa el pago, avisar al mozo,
-- al dueño y al supervisor. La confirmacion posterior del mozo
-- sigue generando el aviso pago_confirmado existente.
CREATE OR REPLACE FUNCTION public.chido_notificar_pago_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_mesa_num integer;
  v_mesa_texto text := 'una mesa';
BEGIN
  IF NEW.estado NOT IN ('pago_informado', 'pagado')
    OR NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  SELECT numero INTO v_mesa_num
  FROM public.mesas
  WHERE id = NEW.mesa_id;

  IF v_mesa_num IS NOT NULL THEN
    v_mesa_texto := 'Mesa ' || v_mesa_num::text;
  END IF;

  IF NEW.estado = 'pago_informado' THEN
    INSERT INTO public.notificaciones_push (
      usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia
    )
    SELECT
      u.id,
      'pago_recibido',
      'Pago informado',
      'El cliente de ' || v_mesa_texto || ' informó el pago de $'
        || COALESCE(NEW.total, 0)::text || '. Espera la confirmación del mozo.',
      jsonb_build_object(
        'ruta', CASE WHEN u.perfil::text = 'mozo' THEN '/mozo/pedidos' ELSE '/mesas/gestion' END,
        'pedidoId', NEW.id,
        'mesaId', NEW.mesa_id
      ),
      'pago_informado:' || NEW.id::text || ':' || u.id::text
    FROM public.usuarios AS u
    WHERE u.perfil::text IN ('mozo', 'dueño', 'supervisor')
      AND u.estado_registro::text = 'aceptado'
    ON CONFLICT (clave_idempotencia) DO NOTHING;
  ELSE
    INSERT INTO public.notificaciones_push (
      usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia
    )
    SELECT
      u.id,
      'pago_confirmado',
      'Pago confirmado',
      'El mozo confirmó el pago de ' || v_mesa_texto || ' y la mesa quedó liberada.',
      jsonb_build_object('ruta', '/mesas/gestion', 'pedidoId', NEW.id),
      'pago_confirmado:' || NEW.id::text || ':' || u.id::text
    FROM public.usuarios AS u
    WHERE u.perfil::text IN ('dueño', 'supervisor')
      AND u.estado_registro::text = 'aceptado'
    ON CONFLICT (clave_idempotencia) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
