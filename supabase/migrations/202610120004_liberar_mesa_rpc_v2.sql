-- RPC nueva para evitar que clientes/cachés sigan resolviendo la función
-- liberar_mesa_admin anterior, que bloqueaba pedidos en curso.
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS cuenta_solicitada_at timestamptz;

CREATE OR REPLACE FUNCTION public.liberar_mesa_admin_v2(
  p_mesa_id uuid,
  p_confirmar_cuenta_pendiente boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_perfil text;
  v_mesa public.mesas%ROWTYPE;
  v_pedido_id uuid;
  v_estado_pedido text;
  v_total numeric;
BEGIN
  SELECT u.perfil::text INTO v_perfil
  FROM public.usuarios AS u
  WHERE u.auth_id = auth.uid()
    AND u.estado_registro::text = 'aceptado';

  IF v_perfil IS DISTINCT FROM 'dueño'
    AND v_perfil IS DISTINCT FROM 'supervisor' THEN
    RAISE EXCEPTION 'Solo el dueño o el supervisor pueden liberar mesas.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_mesa
  FROM public.mesas
  WHERE id = p_mesa_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No encontramos esa mesa.' USING ERRCODE = 'P0002';
  END IF;

  IF v_mesa.disponibilidad::text = 'vacía'
    AND v_mesa.cliente_id IS NULL THEN
    RETURN jsonb_build_object('liberada', true, 'mesa', to_jsonb(v_mesa));
  END IF;

  -- Pedidos activos no bloquean la liberación. Una cuenta pendiente pide
  -- confirmación; al confirmar, la mesa se libera y la cuenta queda registrada.
  SELECT p.id, p.estado::text, p.total
    INTO v_pedido_id, v_estado_pedido, v_total
  FROM public.pedidos AS p
  WHERE p.mesa_id = p_mesa_id
    AND p.cuenta_solicitada_at IS NOT NULL
    AND p.estado::text NOT IN ('pagado', 'cancelado')
  ORDER BY p.cuenta_solicitada_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_pedido_id IS NOT NULL
    AND NOT COALESCE(p_confirmar_cuenta_pendiente, false) THEN
    RETURN jsonb_build_object(
      'liberada', false,
      'requiere_confirmacion', true,
      'mesa_numero', v_mesa.numero,
      'cuenta_pendiente', jsonb_build_object(
        'pedido_id', v_pedido_id,
        'estado', v_estado_pedido,
        'total', v_total
      )
    );
  END IF;

  UPDATE public.mesas
  SET disponibilidad = 'vacía',
      cliente_id = NULL,
      qr_confirmado_at = NULL
  WHERE id = p_mesa_id
  RETURNING * INTO v_mesa;

  UPDATE public.lista_espera
  SET estado = 'eliminado', mesa_id = NULL
  WHERE mesa_id = p_mesa_id AND estado = 'asignado';

  RETURN jsonb_build_object('liberada', true, 'mesa', to_jsonb(v_mesa));
END;
$$;

REVOKE ALL ON FUNCTION public.liberar_mesa_admin_v2(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.liberar_mesa_admin_v2(uuid, boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
