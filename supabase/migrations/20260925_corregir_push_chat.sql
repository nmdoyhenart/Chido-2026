CREATE OR REPLACE FUNCTION public.chido_notificar_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id uuid;
  v_numero_mesa integer;
BEGIN
  -- Obtener el cliente asignado y el número de la mesa
  SELECT cliente_id, numero INTO v_cliente_id, v_numero_mesa
  FROM public.mesas
  WHERE id = NEW.mesa_id;

  IF NEW.es_mozo THEN
    -- Si el mensaje lo envía el MOZO, notificamos ÚNICAMENTE al CLIENTE
    IF v_cliente_id IS NOT NULL THEN
      INSERT INTO public.notificaciones_push (usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia)
      VALUES (
        v_cliente_id,
        'chat_cliente',
        'Nuevo mensaje del mozo',
        NEW.texto,
        jsonb_build_object('ruta', '/cliente/chat'),
        'chat_cliente:' || NEW.id
      );
    END IF;
  ELSE
    -- Si el mensaje lo envía el CLIENTE, notificamos a TODOS los MOZOS activos
    -- (porque en este modelo de datos no hay un mozo_id específico por mesa)
    INSERT INTO public.notificaciones_push (usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia)
    SELECT 
      u.id,
      'chat_mozo',
      'Mensaje de la Mesa ' || v_numero_mesa,
      NEW.texto,
      jsonb_build_object('ruta', '/mozo/chat-mesa?mesaId=' || NEW.mesa_id || '&numero=' || v_numero_mesa),
      'chat_mozo:' || NEW.id || ':' || u.id
    FROM public.usuarios u
    WHERE u.perfil = 'mozo';
  END IF;

  RETURN NEW;
END;
$$;

-- Recrear el trigger para asegurarse de que usa la función corregida
DROP TRIGGER IF EXISTS chido_chat_push ON public.chat_mensajes;
CREATE TRIGGER chido_chat_push
AFTER INSERT ON public.chat_mensajes
FOR EACH ROW EXECUTE FUNCTION public.chido_notificar_chat();
