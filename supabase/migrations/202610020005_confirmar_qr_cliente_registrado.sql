-- Confirma el QR del cliente registrado desde una función autorizada en servidor.
-- Evita depender de permisos de UPDATE directos sobre mesas en RLS.
CREATE OR REPLACE FUNCTION public.confirmar_mesa_qr_cliente(p_mesa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cliente_id uuid;
BEGIN
  SELECT u.id INTO v_cliente_id
  FROM public.usuarios u
  WHERE u.auth_id = auth.uid()
    AND u.perfil::text = 'cliente registrado'
    AND u.estado_registro::text = 'aceptado';
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Ingresá con tu cuenta de cliente registrada.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.mesas m
  SET qr_confirmado_at = COALESCE(m.qr_confirmado_at, now())
  WHERE m.id = p_mesa_id
    AND m.cliente_id = v_cliente_id
    AND m.disponibilidad::text = 'ocupada';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta no es la mesa asignada a tu cuenta.' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_mesa_qr_cliente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_mesa_qr_cliente(uuid) TO authenticated;
