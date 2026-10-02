-- Flujo de pedidos: envío atómico, edición tras rechazo y cola de cocina/bar.
-- Ejecutar en Supabase después de tener creadas pedidos y pedido_detalles.

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS solicitud_id uuid UNIQUE;

ALTER TABLE public.pedido_detalles
  ADD COLUMN IF NOT EXISTS estado_sector text NOT NULL DEFAULT 'pendiente'
    CHECK (estado_sector IN ('pendiente', 'en_preparacion', 'listo'));

CREATE INDEX IF NOT EXISTS pedido_detalles_estado_sector_idx
  ON public.pedido_detalles (estado_sector, pedido_id);

CREATE OR REPLACE FUNCTION public.guardar_pedido_cliente(
  p_mesa_id uuid,
  p_solicitud_id uuid,
  p_detalles jsonb,
  p_pedido_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cliente_id uuid;
  v_pedido_id uuid;
  v_mesa_id uuid;
  v_estado text;
  v_item jsonb;
  v_producto_id uuid;
  v_cantidad integer;
  v_precio numeric(10,2);
  v_total numeric(10,2) := 0;
  v_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT u.id INTO v_cliente_id
  FROM public.usuarios AS u
  WHERE u.auth_id = auth.uid()
    AND u.perfil::text = 'cliente registrado'
    AND u.estado_registro::text = 'aceptado';
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Ingresá con una cuenta de cliente registrada y aceptada.' USING ERRCODE = '42501';
  END IF;
  IF p_mesa_id IS NULL OR p_solicitud_id IS NULL
    OR jsonb_typeof(p_detalles) <> 'array'
    OR jsonb_array_length(p_detalles) < 1
    OR jsonb_array_length(p_detalles) > 100 THEN
    RAISE EXCEPTION 'El pedido está vacío o contiene datos inválidos.' USING ERRCODE = '22023';
  END IF;

  -- Una repetición de la misma solicitud de red devuelve el pedido ya guardado.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_cliente_id::text || ':' || p_solicitud_id::text, 0));
  SELECT p.id, p.total INTO v_pedido_id, v_total
  FROM public.pedidos AS p
  WHERE p.solicitud_id = p_solicitud_id AND p.cliente_id = v_cliente_id;
  IF v_pedido_id IS NOT NULL THEN
    RETURN jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total);
  END IF;

  IF p_pedido_id IS NULL THEN
    SELECT m.id INTO v_mesa_id
    FROM public.mesas AS m
    WHERE m.id = p_mesa_id AND m.cliente_id = v_cliente_id
      AND m.disponibilidad::text = 'ocupada' AND m.qr_confirmado_at IS NOT NULL
    FOR UPDATE;
    IF v_mesa_id IS NULL THEN
      RAISE EXCEPTION 'Escaneá el QR de la mesa que te asignaron antes de pedir.' USING ERRCODE = '42501';
    END IF;
    v_estado := 'pendiente_mozo';
  ELSE
    SELECT p.mesa_id, p.estado INTO v_mesa_id, v_estado
    FROM public.pedidos AS p
    WHERE p.id = p_pedido_id AND p.cliente_id = v_cliente_id
    FOR UPDATE;
    IF v_mesa_id IS NULL OR v_estado <> 'rechazado' THEN
      RAISE EXCEPTION 'Este pedido ya no se puede modificar.' USING ERRCODE = '42501';
    END IF;
    IF v_mesa_id <> p_mesa_id THEN
      RAISE EXCEPTION 'El pedido debe continuar en la mesa asignada.' USING ERRCODE = '42501';
    END IF;
    PERFORM 1 FROM public.mesas AS m
      WHERE m.id = v_mesa_id AND m.cliente_id = v_cliente_id
        AND m.disponibilidad::text = 'ocupada' AND m.qr_confirmado_at IS NOT NULL
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La mesa ya no está asignada a tu cuenta.' USING ERRCODE = '42501';
    END IF;
    v_estado := 'pendiente_mozo';
  END IF;

  -- Se vuelven a consultar los productos y sus precios desde la carta.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_detalles)
  LOOP
    IF jsonb_typeof(v_item) <> 'object'
      OR COALESCE(v_item->>'producto_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      OR COALESCE(v_item->>'cantidad', '') !~ '^[1-9][0-9]{0,3}$' THEN
      RAISE EXCEPTION 'Revisá las cantidades y los productos del pedido.' USING ERRCODE = '22023';
    END IF;
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::integer;
    IF v_producto_id = ANY(v_ids) THEN
      RAISE EXCEPTION 'El pedido contiene un producto repetido.' USING ERRCODE = '22023';
    END IF;
    v_ids := array_append(v_ids, v_producto_id);
    SELECT pr.precio INTO v_precio FROM public.productos AS pr WHERE pr.id = v_producto_id;
    IF NOT FOUND OR v_precio IS NULL OR v_precio <= 0 THEN
      RAISE EXCEPTION 'Uno de los productos ya no está disponible en la carta.' USING ERRCODE = '22023';
    END IF;
    v_total := v_total + (v_precio * v_cantidad);
  END LOOP;
  IF v_total > 99999999.99 THEN
    RAISE EXCEPTION 'El importe del pedido supera el máximo permitido.' USING ERRCODE = '22023';
  END IF;

  IF p_pedido_id IS NULL THEN
    INSERT INTO public.pedidos (cliente_id, mesa_id, estado, total, solicitud_id)
    VALUES (v_cliente_id, v_mesa_id, v_estado, v_total, p_solicitud_id)
    RETURNING id INTO v_pedido_id;
  ELSE
    DELETE FROM public.pedido_detalles WHERE pedido_id = p_pedido_id;
    UPDATE public.pedidos
    SET estado = v_estado, total = v_total, solicitud_id = p_solicitud_id
    WHERE id = p_pedido_id AND cliente_id = v_cliente_id;
    v_pedido_id := p_pedido_id;
  END IF;

  INSERT INTO public.pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario, estado_sector)
  SELECT v_pedido_id, pr.id, (item->>'cantidad')::integer, pr.precio, 'pendiente'
  FROM jsonb_array_elements(p_detalles) AS entries(item)
  JOIN public.productos AS pr ON pr.id = (item->>'producto_id')::uuid;

  RETURN jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_pedido_rechazado_cliente(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cliente_id uuid;
  v_resultado jsonb;
BEGIN
  SELECT u.id INTO v_cliente_id FROM public.usuarios AS u
  WHERE u.auth_id = auth.uid() AND u.perfil::text = 'cliente registrado'
    AND u.estado_registro::text = 'aceptado';
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Ingresá con tu cuenta de cliente.' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'id', p.id, 'mesa_id', p.mesa_id, 'estado', p.estado,
    'detalles', COALESCE(jsonb_agg(jsonb_build_object(
      'producto_id', d.producto_id, 'cantidad', d.cantidad
    )) FILTER (WHERE d.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_resultado
  FROM public.pedidos AS p
  LEFT JOIN public.pedido_detalles AS d ON d.pedido_id = p.id
  WHERE p.id = p_pedido_id AND p.cliente_id = v_cliente_id
    AND p.estado = 'rechazado'
  GROUP BY p.id;
  IF v_resultado IS NULL THEN
    RAISE EXCEPTION 'El pedido ya no está pendiente de modificación.' USING ERRCODE = '42501';
  END IF;
  RETURN v_resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.decidir_pedido_mozo(p_pedido_id uuid, p_decision text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_perfil text;
  v_estado text;
BEGIN
  SELECT u.perfil::text INTO v_perfil FROM public.usuarios AS u
  WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado';
  IF v_perfil <> 'mozo' THEN RAISE EXCEPTION 'Solo un mozo puede decidir este pedido.' USING ERRCODE = '42501'; END IF;
  IF p_decision NOT IN ('confirmado', 'rechazado') THEN RAISE EXCEPTION 'La decisión no es válida.' USING ERRCODE = '22023'; END IF;
  SELECT estado INTO v_estado FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'No encontramos ese pedido.' USING ERRCODE = 'P0002'; END IF;
  IF v_estado = p_decision THEN RETURN; END IF;
  IF v_estado <> 'pendiente_mozo' THEN RAISE EXCEPTION 'El pedido ya fue atendido.' USING ERRCODE = '40001'; END IF;
  IF p_decision = 'confirmado' AND NOT EXISTS (SELECT 1 FROM public.pedido_detalles WHERE pedido_id = p_pedido_id) THEN
    RAISE EXCEPTION 'No se puede confirmar un pedido sin productos.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.pedidos SET estado = p_decision WHERE id = p_pedido_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_pedidos_mozo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_perfil text;
  v_resultado jsonb;
BEGIN
  SELECT u.perfil::text INTO v_perfil FROM public.usuarios AS u
  WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado';
  IF v_perfil <> 'mozo' THEN RAISE EXCEPTION 'Solo un mozo puede consultar esta bandeja.' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'cliente_id', p.cliente_id, 'mesa_id', p.mesa_id,
    'estado', p.estado, 'total', p.total, 'created_at', p.created_at,
    'mesas', jsonb_build_object('numero', m.numero, 'tipo', m.tipo, 'cantidad_comensales', m.cantidad_comensales),
    'usuarios', jsonb_build_object('nombres', u.nombres, 'apellidos', u.apellidos),
    'pedido_detalles', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', d.id, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario,
      'estado_sector', d.estado_sector, 'productos', jsonb_build_object('nombre', pr.nombre, 'tipo', pr.tipo)
    ) ORDER BY pr.nombre), '[]'::jsonb)
      FROM public.pedido_detalles AS d JOIN public.productos AS pr ON pr.id = d.producto_id
      WHERE d.pedido_id = p.id)
  ) ORDER BY p.created_at DESC), '[]'::jsonb) INTO v_resultado
  FROM public.pedidos AS p
  JOIN public.mesas AS m ON m.id = p.mesa_id
  JOIN public.usuarios AS u ON u.id = p.cliente_id;
  RETURN v_resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_trabajo_sector(p_tipo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_perfil text;
  v_resultado jsonb;
BEGIN
  SELECT u.perfil::text INTO v_perfil FROM public.usuarios AS u
  WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado';
  IF NOT ((p_tipo = 'plato' AND v_perfil = 'cocinero') OR (p_tipo = 'bebida' AND v_perfil = 'cantinero')) THEN
    RAISE EXCEPTION 'Tu perfil no puede abrir esta bandeja.' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'mesa_numero', m.numero, 'created_at', p.created_at,
    'detalles', (SELECT jsonb_agg(jsonb_build_object(
      'id', d.id, 'producto_id', pr.id, 'nombre', pr.nombre,
      'cantidad', d.cantidad, 'estado', d.estado_sector, 'foto', pr.fotos[1]
    ) ORDER BY pr.nombre)
      FROM public.pedido_detalles AS d
      JOIN public.productos AS pr ON pr.id = d.producto_id
      WHERE d.pedido_id = p.id AND pr.tipo::text = p_tipo)
  ) ORDER BY p.created_at), '[]'::jsonb) INTO v_resultado
  FROM public.pedidos AS p JOIN public.mesas AS m ON m.id = p.mesa_id
  WHERE p.estado IN ('confirmado', 'en_preparacion')
    AND EXISTS (SELECT 1 FROM public.pedido_detalles AS d
      JOIN public.productos AS pr ON pr.id = d.producto_id
      WHERE d.pedido_id = p.id AND pr.tipo::text = p_tipo);
  RETURN v_resultado;
END;
$$;

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
  IF p_estado NOT IN ('pendiente', 'en_preparacion', 'listo') THEN RAISE EXCEPTION 'Ese estado no es válido.' USING ERRCODE = '22023'; END IF;
  SELECT pr.tipo::text, p.estado INTO v_tipo, v_estado_pedido
  FROM public.pedido_detalles AS d JOIN public.productos AS pr ON pr.id = d.producto_id
  JOIN public.pedidos AS p ON p.id = d.pedido_id WHERE d.id = p_detalle_id;
  IF v_tipo IS NULL THEN RAISE EXCEPTION 'No encontramos ese producto del pedido.' USING ERRCODE = 'P0002'; END IF;
  IF NOT ((v_tipo = 'plato' AND v_perfil = 'cocinero') OR (v_tipo = 'bebida' AND v_perfil = 'cantinero')) THEN
    RAISE EXCEPTION 'Tu perfil no puede actualizar este producto.' USING ERRCODE = '42501';
  END IF;
  IF v_estado_pedido NOT IN ('confirmado', 'en_preparacion') THEN RAISE EXCEPTION 'El pedido todavía no fue confirmado por el mozo.' USING ERRCODE = '40001'; END IF;
  UPDATE public.pedido_detalles SET estado_sector = p_estado WHERE id = p_detalle_id;
  UPDATE public.pedidos SET estado = 'en_preparacion' WHERE id = (
    SELECT pedido_id FROM public.pedido_detalles WHERE id = p_detalle_id
  ) AND estado = 'confirmado';
END;
$$;

CREATE OR REPLACE FUNCTION public.entregar_pedido_mozo(p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_perfil text;
BEGIN
  SELECT u.perfil::text INTO v_perfil FROM public.usuarios AS u
  WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado';
  IF v_perfil <> 'mozo' THEN RAISE EXCEPTION 'Solo un mozo puede entregar el pedido.' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.pedidos WHERE id = p_pedido_id AND estado = 'en_preparacion' FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.pedido_detalles WHERE pedido_id = p_pedido_id)
    OR EXISTS (SELECT 1 FROM public.pedido_detalles WHERE pedido_id = p_pedido_id AND estado_sector <> 'listo') THEN
    RAISE EXCEPTION 'Cocina y bar todavía no terminaron este pedido.' USING ERRCODE = '40001';
  END IF;
  UPDATE public.pedidos SET estado = 'entregado' WHERE id = p_pedido_id;
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_pedido_cliente(uuid, uuid, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obtener_pedido_rechazado_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decidir_pedido_mozo(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obtener_pedidos_mozo() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obtener_trabajo_sector(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.actualizar_item_sector(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.entregar_pedido_mozo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_pedido_cliente(uuid, uuid, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_pedido_rechazado_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decidir_pedido_mozo(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_pedidos_mozo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_trabajo_sector(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_item_sector(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.entregar_pedido_mozo(uuid) TO authenticated;

-- Avisos push al cliente cuando el mozo decide, y al sector al confirmar.
DO $$ BEGIN
  IF to_regclass('public.notificaciones_push') IS NOT NULL
    AND to_regprocedure('private.chido_encolar_push_para_perfiles(text,text,text,jsonb,public.tipo_perfil[],text)') IS NOT NULL THEN
    EXECUTE $trigger$
      CREATE OR REPLACE FUNCTION private.chido_notificar_estado_pedido()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $body$
      BEGIN
        IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado IN ('confirmado', 'rechazado') THEN
          INSERT INTO public.notificaciones_push (usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia)
          SELECT NEW.cliente_id, 'pedido_' || NEW.estado,
            CASE WHEN NEW.estado = 'rechazado' THEN 'Podés modificar tu pedido' ELSE 'Tu pedido fue confirmado' END,
            CASE WHEN NEW.estado = 'rechazado' THEN 'El mozo rechazó el pedido. Revisalo y volvé a enviarlo.' ELSE 'El pedido se envió a cocina y bar.' END,
            jsonb_build_object('ruta', '/cliente/estado-pedido', 'pedidoId', NEW.id),
            'pedido:' || NEW.id::text || ':' || NEW.estado || ':' || txid_current()::text
          ON CONFLICT (clave_idempotencia) DO NOTHING;
        END IF;
        IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado = 'confirmado' THEN
          IF EXISTS (SELECT 1 FROM public.pedido_detalles d JOIN public.productos pr ON pr.id = d.producto_id WHERE d.pedido_id = NEW.id AND pr.tipo::text = 'plato') THEN
            PERFORM private.chido_encolar_push_para_perfiles('pedido_confirmado', 'Nuevo pedido confirmado', 'Hay platos pendientes en cocina.', jsonb_build_object('ruta', '/cocina/pedidos'), ARRAY['cocinero']::public.tipo_perfil[], 'pedido_cocina:' || NEW.id::text || ':' || txid_current()::text);
          END IF;
          IF EXISTS (SELECT 1 FROM public.pedido_detalles d JOIN public.productos pr ON pr.id = d.producto_id WHERE d.pedido_id = NEW.id AND pr.tipo::text = 'bebida') THEN
            PERFORM private.chido_encolar_push_para_perfiles('pedido_confirmado', 'Nuevo pedido confirmado', 'Hay bebidas pendientes en bar.', jsonb_build_object('ruta', '/bar/pedidos'), ARRAY['cantinero']::public.tipo_perfil[], 'pedido_bar:' || NEW.id::text || ':' || txid_current()::text);
          END IF;
        END IF;
        RETURN NEW;
      END;
      $body$;
    $trigger$;
    EXECUTE 'DROP TRIGGER IF EXISTS chido_pedido_push ON public.pedidos';
    EXECUTE 'CREATE TRIGGER chido_pedido_push AFTER UPDATE OF estado ON public.pedidos FOR EACH ROW EXECUTE FUNCTION private.chido_notificar_estado_pedido()';
  END IF;
END $$;
