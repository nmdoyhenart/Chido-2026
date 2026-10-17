-- Trigger para notificar pago recibido a Mozo, Dueño y Supervisor (Punto 21 del TP)
-- Se activa únicamente cuando un pedido pasa al estado 'pagado'.

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
  -- Solo se activa cuando el pedido pasa a estado 'pagado'
  IF NEW.estado = 'pagado' AND (OLD.estado IS NULL OR OLD.estado IS DISTINCT FROM 'pagado') THEN
    
    -- Obtener número de la mesa
    SELECT numero INTO v_mesa_num FROM public.mesas WHERE id = NEW.mesa_id;
    IF v_mesa_num IS NOT NULL THEN
      v_mesa_texto := 'Mesa ' || v_mesa_num::text;
    END IF;

    -- 1. Notificación a los MOZOS (con ruta a /mozo/pedidos)
    INSERT INTO public.notificaciones_push (
      usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia
    )
    SELECT 
      u.id,
      'pago_recibido',
      'Pago recibido',
      'El cliente de ' || v_mesa_texto || ' realizó el pago de $' || COALESCE(NEW.total, 0)::text || '. Espera tu confirmación.',
      jsonb_build_object('ruta', '/mozo/pedidos', 'pedidoId', NEW.id),
      'pago_mozo:' || NEW.id::text || ':' || u.id::text || ':' || gen_random_uuid()::text
    FROM public.usuarios u
    WHERE u.perfil::text = 'mozo'
    ON CONFLICT (clave_idempotencia) DO NOTHING;

    -- 2. Notificación a DUEÑO y SUPERVISOR (con ruta a /mesas/gestion)
    INSERT INTO public.notificaciones_push (
      usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia
    )
    SELECT 
      u.id,
      'pago_recibido',
      'Pago recibido',
      'El cliente de ' || v_mesa_texto || ' realizó el pago de $' || COALESCE(NEW.total, 0)::text || '. Espera confirmación del mozo.',
      jsonb_build_object('ruta', '/mesas/gestion', 'pedidoId', NEW.id),
      'pago_admin:' || NEW.id::text || ':' || u.id::text || ':' || gen_random_uuid()::text
    FROM public.usuarios u
    WHERE u.perfil::text IN ('dueño', 'supervisor')
    ON CONFLICT (clave_idempotencia) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

-- Asociar el trigger a la tabla pedidos
DROP TRIGGER IF EXISTS tr_chido_notificar_pago ON public.pedidos;
CREATE TRIGGER tr_chido_notificar_pago
AFTER UPDATE OF estado ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.chido_notificar_pago_pedido();

-- Habilitar REPLICA IDENTITY FULL para que Supabase Realtime notifique al dispositivo al instante
ALTER TABLE IF EXISTS public.pedidos REPLICA IDENTITY FULL;
