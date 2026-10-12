-- Los rechazos por estado del pedido son errores de negocio, no fallos de serialización.
-- 40001 puede activar reintentos automáticos; P0001 representa una excepción de aplicación.

CREATE OR REPLACE FUNCTION public.actualizar_item_sector(p_detalle_id uuid, p_estado text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_perfil text;
  v_tipo text;
  v_estado_pedido text;
BEGIN
  SELECT u.perfil::text INTO v_perfil FROM public.usuarios AS u
  WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado';
  IF p_estado NOT IN ('pendiente', 'en_preparacion', 'listo') THEN
    RAISE EXCEPTION 'Ese estado no es válido.' USING ERRCODE = '22023';
  END IF;
  SELECT pr.tipo::text, p.estado INTO v_tipo, v_estado_pedido
  FROM public.pedido_detalles AS d JOIN public.productos AS pr ON pr.id = d.producto_id
  JOIN public.pedidos AS p ON p.id = d.pedido_id WHERE d.id = p_detalle_id;
  IF v_tipo IS NULL THEN RAISE EXCEPTION 'No encontramos ese producto del pedido.' USING ERRCODE = 'P0002'; END IF;
  IF NOT ((v_tipo IN ('plato', 'postre') AND v_perfil = 'cocinero') OR (v_tipo = 'bebida' AND v_perfil = 'cantinero')) THEN
    RAISE EXCEPTION 'Tu perfil no puede actualizar este producto.' USING ERRCODE = '42501';
  END IF;
  IF v_estado_pedido NOT IN ('confirmado', 'en_preparacion') THEN
    RAISE EXCEPTION 'El pedido todavía no fue confirmado por el mozo.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.pedido_detalles SET estado_sector = p_estado WHERE id = p_detalle_id;
  UPDATE public.pedidos SET estado = 'en_preparacion' WHERE id = (
    SELECT pedido_id FROM public.pedido_detalles WHERE id = p_detalle_id
  ) AND estado = 'confirmado';
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_recepcion_pedido_cliente(p_pedido_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cliente_id uuid;
  v_estado text;
BEGIN
  SELECT id INTO v_cliente_id FROM public.usuarios
  WHERE auth_id = auth.uid() AND perfil::text = 'cliente registrado'
    AND estado_registro::text = 'aceptado';
  IF v_cliente_id IS NULL THEN RAISE EXCEPTION 'No se pudo validar tu cuenta de cliente.' USING ERRCODE = '42501'; END IF;
  SELECT estado INTO v_estado FROM public.pedidos
  WHERE id = p_pedido_id AND cliente_id = v_cliente_id FOR UPDATE;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'No encontramos este pedido para tu cliente.' USING ERRCODE = '42501'; END IF;
  IF v_estado = 'recibido' THEN RETURN v_estado; END IF;
  IF v_estado <> 'entregado' THEN RAISE EXCEPTION 'El mozo todavía no marcó el pedido como entregado.' USING ERRCODE = 'P0001'; END IF;
  UPDATE public.pedidos SET estado = 'recibido' WHERE id = p_pedido_id;
  RETURN 'recibido';
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_recepcion_pedido_anonimo(p_cliente_anonimo_id uuid, p_pedido_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_estado text;
BEGIN
  SELECT p.estado INTO v_estado FROM public.pedidos AS p
  JOIN public.lista_espera AS l ON l.id = p.lista_espera_id
  WHERE p.id = p_pedido_id AND l.identificador = p_cliente_anonimo_id::text AND l.tipo_cliente = 'anonimo'
  FOR UPDATE OF p;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'No encontramos este pedido para tu sesión.' USING ERRCODE = '42501'; END IF;
  IF v_estado = 'recibido' THEN RETURN v_estado; END IF;
  IF v_estado <> 'entregado' THEN RAISE EXCEPTION 'El mozo todavía no marcó el pedido como entregado.' USING ERRCODE = 'P0001'; END IF;
  UPDATE public.pedidos SET estado = 'recibido' WHERE id = p_pedido_id;
  RETURN 'recibido';
END;
$$;

CREATE OR REPLACE FUNCTION public.solicitar_cuenta_pedido_cliente(p_pedido_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cliente_id uuid;
  v_estado text;
  v_solicitada timestamptz;
BEGIN
  SELECT id INTO v_cliente_id FROM public.usuarios
  WHERE auth_id = auth.uid() AND perfil::text = 'cliente registrado'
    AND estado_registro::text = 'aceptado';
  IF v_cliente_id IS NULL THEN RAISE EXCEPTION 'No se pudo validar tu cuenta de cliente.' USING ERRCODE = '42501'; END IF;
  SELECT estado, cuenta_solicitada_at INTO v_estado, v_solicitada FROM public.pedidos
  WHERE id = p_pedido_id AND cliente_id = v_cliente_id FOR UPDATE;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'No encontramos este pedido para tu cliente.' USING ERRCODE = '42501'; END IF;
  IF v_estado <> 'recibido' THEN RAISE EXCEPTION 'Confirmá primero la recepción del pedido.' USING ERRCODE = 'P0001'; END IF;
  IF v_solicitada IS NULL THEN
    UPDATE public.pedidos SET cuenta_solicitada_at = now()
    WHERE id = p_pedido_id RETURNING cuenta_solicitada_at INTO v_solicitada;
  END IF;
  RETURN v_solicitada;
END;
$$;

CREATE OR REPLACE FUNCTION public.solicitar_cuenta_pedido_anonimo(p_cliente_anonimo_id uuid, p_pedido_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_estado text;
  v_solicitada timestamptz;
BEGIN
  SELECT p.estado, p.cuenta_solicitada_at INTO v_estado, v_solicitada
  FROM public.pedidos AS p JOIN public.lista_espera AS l ON l.id = p.lista_espera_id
  WHERE p.id = p_pedido_id AND l.identificador = p_cliente_anonimo_id::text AND l.tipo_cliente = 'anonimo'
  FOR UPDATE OF p;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'No encontramos este pedido para tu sesión.' USING ERRCODE = '42501'; END IF;
  IF v_estado <> 'recibido' THEN RAISE EXCEPTION 'Confirmá primero la recepción del pedido.' USING ERRCODE = 'P0001'; END IF;
  IF v_solicitada IS NULL THEN
    UPDATE public.pedidos SET cuenta_solicitada_at = now()
    WHERE id = p_pedido_id RETURNING cuenta_solicitada_at INTO v_solicitada;
  END IF;
  RETURN v_solicitada;
END;
$$;
