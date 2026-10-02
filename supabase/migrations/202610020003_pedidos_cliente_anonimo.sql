-- Habilita pedidos de clientes anonimos identificados por su sesion de lista de espera.
-- Aplicar luego de 202610020002_lista_espera_clientes_registrados.sql.

ALTER TABLE public.pedidos
  ALTER COLUMN cliente_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS lista_espera_id uuid REFERENCES public.lista_espera(id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_un_solo_cliente') THEN
    ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_un_solo_cliente
      CHECK ((cliente_id IS NOT NULL) <> (lista_espera_id IS NOT NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS pedidos_lista_espera_idx ON public.pedidos(lista_espera_id);

CREATE OR REPLACE FUNCTION public.confirmar_mesa_qr_anonimo(p_cliente_anonimo_id uuid, p_mesa_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_lista_id uuid;
BEGIN
  SELECT l.id INTO v_lista_id FROM public.lista_espera l
  WHERE l.identificador = p_cliente_anonimo_id::text AND l.tipo_cliente = 'anonimo'
    AND l.estado = 'asignado' AND l.mesa_id = p_mesa_id FOR UPDATE;
  IF v_lista_id IS NULL THEN RAISE EXCEPTION 'Esta no es la mesa asignada a tu sesión.' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.mesas m WHERE m.id = p_mesa_id AND m.disponibilidad::text = 'ocupada'
    AND m.cliente_id IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La mesa ya no está disponible para esta sesión.' USING ERRCODE = '42501'; END IF;
  UPDATE public.mesas SET qr_confirmado_at = COALESCE(qr_confirmado_at, now()) WHERE id = p_mesa_id;
END $$;

CREATE OR REPLACE FUNCTION public.guardar_pedido_cliente_anonimo(
  p_cliente_anonimo_id uuid, p_mesa_id uuid, p_solicitud_id uuid, p_detalles jsonb, p_pedido_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_lista_id uuid; v_pedido_id uuid; v_mesa_id uuid; v_estado text; v_item jsonb;
  v_producto_id uuid; v_cantidad integer; v_precio numeric(10,2); v_total numeric(10,2) := 0;
  v_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF p_cliente_anonimo_id IS NULL OR p_mesa_id IS NULL OR p_solicitud_id IS NULL
    OR jsonb_typeof(p_detalles) <> 'array' OR jsonb_array_length(p_detalles) < 1 OR jsonb_array_length(p_detalles) > 100 THEN
    RAISE EXCEPTION 'El pedido está vacío o contiene datos inválidos.' USING ERRCODE = '22023';
  END IF;
  SELECT l.id INTO v_lista_id FROM public.lista_espera l
  WHERE l.identificador = p_cliente_anonimo_id::text AND l.tipo_cliente = 'anonimo'
    AND l.estado = 'asignado' AND l.mesa_id = p_mesa_id FOR UPDATE;
  IF v_lista_id IS NULL THEN RAISE EXCEPTION 'No encontramos tu mesa asignada.' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.mesas m WHERE m.id = p_mesa_id AND m.cliente_id IS NULL
    AND m.disponibilidad::text = 'ocupada' AND m.qr_confirmado_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escaneá el QR de tu mesa asignada antes de pedir.' USING ERRCODE = '42501'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_lista_id::text || ':' || p_solicitud_id::text, 0));
  SELECT p.id, p.total INTO v_pedido_id, v_total FROM public.pedidos p
  WHERE p.solicitud_id = p_solicitud_id AND p.lista_espera_id = v_lista_id;
  IF v_pedido_id IS NOT NULL THEN RETURN jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total); END IF;
  -- SELECT INTO deja NULL los destinos cuando no encuentra filas.
  -- Reiniciar el acumulador antes de calcular un pedido nuevo.
  v_total := 0;

  IF p_pedido_id IS NOT NULL THEN
    SELECT p.mesa_id, p.estado INTO v_mesa_id, v_estado FROM public.pedidos p
    WHERE p.id = p_pedido_id AND p.lista_espera_id = v_lista_id FOR UPDATE;
    IF v_mesa_id IS NULL OR v_estado <> 'rechazado' OR v_mesa_id <> p_mesa_id THEN
      RAISE EXCEPTION 'Este pedido ya no se puede modificar.' USING ERRCODE = '42501';
    END IF;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_detalles) LOOP
    IF jsonb_typeof(v_item) <> 'object'
      OR COALESCE(v_item->>'producto_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      OR COALESCE(v_item->>'cantidad', '') !~ '^[1-9][0-9]{0,3}$' THEN
      RAISE EXCEPTION 'Revisá las cantidades y los productos del pedido.' USING ERRCODE = '22023';
    END IF;
    v_producto_id := (v_item->>'producto_id')::uuid; v_cantidad := (v_item->>'cantidad')::integer;
    IF v_producto_id = ANY(v_ids) THEN RAISE EXCEPTION 'El pedido contiene un producto repetido.' USING ERRCODE = '22023'; END IF;
    v_ids := array_append(v_ids, v_producto_id);
    SELECT pr.precio INTO v_precio FROM public.productos pr WHERE pr.id = v_producto_id;
    IF NOT FOUND OR v_precio IS NULL OR v_precio <= 0 THEN RAISE EXCEPTION 'Uno de los productos ya no está disponible.' USING ERRCODE = '22023'; END IF;
    v_total := v_total + v_precio * v_cantidad;
  END LOOP;
  IF v_total > 99999999.99 THEN RAISE EXCEPTION 'El importe supera el máximo permitido.' USING ERRCODE = '22023'; END IF;

  IF p_pedido_id IS NULL THEN
    INSERT INTO public.pedidos(cliente_id, lista_espera_id, mesa_id, estado, total, solicitud_id)
    VALUES(NULL, v_lista_id, p_mesa_id, 'pendiente_mozo', v_total, p_solicitud_id) RETURNING id INTO v_pedido_id;
  ELSE
    DELETE FROM public.pedido_detalles WHERE pedido_id = p_pedido_id;
    UPDATE public.pedidos SET estado = 'pendiente_mozo', total = v_total, solicitud_id = p_solicitud_id WHERE id = p_pedido_id;
    v_pedido_id := p_pedido_id;
  END IF;
  INSERT INTO public.pedido_detalles(pedido_id, producto_id, cantidad, precio_unitario, estado_sector)
  SELECT v_pedido_id, pr.id, (item->>'cantidad')::integer, pr.precio, 'pendiente'
  FROM jsonb_array_elements(p_detalles) entries(item) JOIN public.productos pr ON pr.id = (item->>'producto_id')::uuid;
  RETURN jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total);
END $$;

CREATE OR REPLACE FUNCTION public.obtener_pedido_rechazado_anonimo(p_cliente_anonimo_id uuid, p_pedido_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_resultado jsonb;
BEGIN
  SELECT jsonb_build_object('id', p.id, 'mesa_id', p.mesa_id, 'estado', p.estado,
    'detalles', COALESCE(jsonb_agg(jsonb_build_object('producto_id', d.producto_id, 'cantidad', d.cantidad)
      ORDER BY d.id) FILTER (WHERE d.id IS NOT NULL), '[]'::jsonb)) INTO v_resultado
  FROM public.pedidos p JOIN public.lista_espera l ON l.id = p.lista_espera_id
  LEFT JOIN public.pedido_detalles d ON d.pedido_id = p.id
  WHERE p.id = p_pedido_id AND l.identificador = p_cliente_anonimo_id::text AND l.tipo_cliente = 'anonimo'
    AND p.estado = 'rechazado' GROUP BY p.id;
  IF v_resultado IS NULL THEN RAISE EXCEPTION 'El pedido ya no está pendiente de modificación.' USING ERRCODE = '42501'; END IF;
  RETURN v_resultado;
END $$;

CREATE OR REPLACE FUNCTION public.obtener_estado_pedido_anonimo(p_cliente_anonimo_id uuid, p_pedido_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_estado text;
BEGIN
  SELECT p.estado INTO v_estado FROM public.pedidos p JOIN public.lista_espera l ON l.id = p.lista_espera_id
  WHERE p.id = p_pedido_id AND l.identificador = p_cliente_anonimo_id::text AND l.tipo_cliente = 'anonimo';
  IF v_estado IS NULL THEN RAISE EXCEPTION 'No encontramos este pedido de tu sesión.' USING ERRCODE = '42501'; END IF;
  RETURN v_estado;
END $$;

CREATE OR REPLACE FUNCTION public.obtener_pedidos_mozo()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_perfil text; v_resultado jsonb;
BEGIN
  SELECT u.perfil::text INTO v_perfil FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado';
  IF v_perfil <> 'mozo' THEN RAISE EXCEPTION 'Solo un mozo puede consultar esta bandeja.' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'cliente_id', p.cliente_id, 'lista_espera_id', p.lista_espera_id, 'mesa_id', p.mesa_id,
    'estado', p.estado, 'total', p.total, 'created_at', p.created_at,
    'mesas', jsonb_build_object('numero', m.numero, 'tipo', m.tipo, 'cantidad_comensales', m.cantidad_comensales),
    'usuarios', CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object('nombres', u.nombres, 'apellidos', u.apellidos) END,
    'cliente_nombre', COALESCE(NULLIF(l.nombre, ''), concat_ws(' ', u.nombres, u.apellidos), 'Cliente anónimo'),
    'pedido_detalles', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', d.id, 'cantidad', d.cantidad,
      'precio_unitario', d.precio_unitario, 'estado_sector', d.estado_sector,
      'productos', jsonb_build_object('nombre', pr.nombre, 'tipo', pr.tipo)) ORDER BY pr.nombre), '[]'::jsonb)
      FROM public.pedido_detalles d JOIN public.productos pr ON pr.id = d.producto_id WHERE d.pedido_id = p.id)
  ) ORDER BY p.created_at DESC), '[]'::jsonb) INTO v_resultado
  FROM public.pedidos p JOIN public.mesas m ON m.id = p.mesa_id
  LEFT JOIN public.usuarios u ON u.id = p.cliente_id LEFT JOIN public.lista_espera l ON l.id = p.lista_espera_id;
  RETURN v_resultado;
END $$;

REVOKE ALL ON FUNCTION public.confirmar_mesa_qr_anonimo(uuid, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.guardar_pedido_cliente_anonimo(uuid, uuid, uuid, jsonb, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.obtener_pedido_rechazado_anonimo(uuid, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.obtener_estado_pedido_anonimo(uuid, uuid) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_mesa_qr_anonimo(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.guardar_pedido_cliente_anonimo(uuid, uuid, uuid, jsonb, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.obtener_pedido_rechazado_anonimo(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.obtener_estado_pedido_anonimo(uuid, uuid) TO anon;
REVOKE ALL ON FUNCTION public.obtener_pedidos_mozo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_pedidos_mozo() TO authenticated;

-- El push existente usa usuario_id y por eso sólo puede notificarse a clientes registrados.
-- Evita que un pedido anónimo confirmado/rechazado intente insertar NULL en esa cola.
DO $$ BEGIN
  IF to_regprocedure('private.chido_notificar_estado_pedido()') IS NOT NULL THEN
    EXECUTE $fn$ CREATE OR REPLACE FUNCTION private.chido_notificar_estado_pedido()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $body$
      BEGIN
        IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado IN ('confirmado', 'rechazado') AND NEW.cliente_id IS NOT NULL THEN
          INSERT INTO public.notificaciones_push(usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia)
          VALUES(NEW.cliente_id, 'pedido_' || NEW.estado,
            CASE WHEN NEW.estado = 'rechazado' THEN 'Podés modificar tu pedido' ELSE 'Tu pedido fue confirmado' END,
            CASE WHEN NEW.estado = 'rechazado' THEN 'El mozo rechazó el pedido. Revisalo y volvé a enviarlo.' ELSE 'El pedido se envió a cocina y bar.' END,
            jsonb_build_object('ruta', '/cliente/estado-pedido', 'pedidoId', NEW.id),
            'pedido:' || NEW.id::text || ':' || NEW.estado || ':' || txid_current()::text)
          ON CONFLICT (clave_idempotencia) DO NOTHING;
        END IF;
        IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado = 'confirmado' THEN
          IF EXISTS (SELECT 1 FROM public.pedido_detalles d JOIN public.productos pr ON pr.id=d.producto_id WHERE d.pedido_id=NEW.id AND pr.tipo::text='plato')
            THEN PERFORM private.chido_encolar_push_para_perfiles('pedido_confirmado','Nuevo pedido confirmado','Hay platos pendientes en cocina.',jsonb_build_object('ruta','/cocina/pedidos'),ARRAY['cocinero']::public.tipo_perfil[],'pedido_cocina:'||NEW.id::text||':'||txid_current()::text); END IF;
          IF EXISTS (SELECT 1 FROM public.pedido_detalles d JOIN public.productos pr ON pr.id=d.producto_id WHERE d.pedido_id=NEW.id AND pr.tipo::text='bebida')
            THEN PERFORM private.chido_encolar_push_para_perfiles('pedido_confirmado','Nuevo pedido confirmado','Hay bebidas pendientes en bar.',jsonb_build_object('ruta','/bar/pedidos'),ARRAY['cantinero']::public.tipo_perfil[],'pedido_bar:'||NEW.id::text||':'||txid_current()::text); END IF;
        END IF;
        RETURN NEW;
      END $body$ $fn$;
  END IF;
END $$;
