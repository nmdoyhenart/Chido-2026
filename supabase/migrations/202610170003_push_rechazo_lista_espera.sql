CREATE OR REPLACE FUNCTION public.eliminar_de_lista_espera_metre(p_lista_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_perfil text;
  v_usuario_id uuid;
BEGIN
  SELECT perfil::text INTO v_perfil
  FROM public.usuarios
  WHERE auth_id = auth.uid() AND estado_registro::text = 'aceptado';
  IF v_perfil IS DISTINCT FROM 'metre' THEN
    RAISE EXCEPTION 'Solo el metre puede quitar clientes de la lista.' USING ERRCODE = '42501';
  END IF;

  SELECT usuario_id INTO v_usuario_id
  FROM public.lista_espera
  WHERE id = p_lista_id AND estado = 'esperando'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El cliente ya no está esperando.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lista_espera
  SET estado = 'eliminado'
  WHERE id = p_lista_id;

  IF v_usuario_id IS NOT NULL THEN
    INSERT INTO public.notificaciones_push (
      usuario_id,
      evento,
      titulo,
      cuerpo,
      datos,
      clave_idempotencia
    ) VALUES (
      v_usuario_id,
      'mesa_rechazada',
      'No pudimos asignarte una mesa',
      'Tu solicitud de mesa fue rechazada. Podés volver a solicitar una mesa cuando quieras.',
      jsonb_build_object('ruta', '/cliente/espera-mesa'),
      'mesa_rechazada:' || p_lista_id::text || ':' || v_usuario_id::text
    )
    ON CONFLICT (clave_idempotencia) DO NOTHING;
  END IF;
END;
$$;
