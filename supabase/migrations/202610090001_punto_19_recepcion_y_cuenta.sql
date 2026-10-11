-- Punto 19: el cliente confirma que recibió el pedido y puede solicitar la cuenta.
-- Los postres se preparan en cocina junto con los platos.

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS cuenta_solicitada_at timestamptz;

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
      WHERE d.pedido_id = p.id
        AND (pr.tipo::text = p_tipo OR (p_tipo = 'plato' AND pr.tipo::text = 'postre')))
  ) ORDER BY p.created_at), '[]'::jsonb) INTO v_resultado
  FROM public.pedidos AS p JOIN public.mesas AS m ON m.id = p.mesa_id
  WHERE p.estado IN ('confirmado', 'en_preparacion')
    AND EXISTS (SELECT 1 FROM public.pedido_detalles AS d
      JOIN public.productos AS pr ON pr.id = d.producto_id
      WHERE d.pedido_id = p.id
        AND (pr.tipo::text = p_tipo OR (p_tipo = 'plato' AND pr.tipo::text = 'postre')));
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
    RAISE EXCEPTION 'El pedido todavía no fue confirmado por el mozo.' USING ERRCODE = '40001';
  END IF;
  UPDATE public.pedido_detalles SET estado_sector = p_estado WHERE id = p_detalle_id;
  UPDATE public.pedidos SET estado = 'en_preparacion' WHERE id = (
    SELECT pedido_id FROM public.pedido_detalles WHERE id = p_detalle_id
  ) AND estado = 'confirmado';
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_recepcion_pedido_cliente(
  p_pedido_id uuid,
  p_cliente_anonimo_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cliente_id uuid;
  v_estado text;
BEGIN
  IF p_cliente_anonimo_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.usuarios
    WHERE auth_id = auth.uid() AND perfil::text = 'cliente registrado'
      AND estado_registro::text = 'aceptado';
    IF v_cliente_id IS NULL THEN RAISE EXCEPTION 'No se pudo validar tu cuenta de cliente.' USING ERRCODE = '42501'; END IF;
    SELECT estado INTO v_estado FROM public.pedidos
    WHERE id = p_pedido_id AND cliente_id = v_cliente_id FOR UPDATE;
  ELSE
    SELECT p.estado INTO v_estado
    FROM public.pedidos p
    JOIN public.lista_espera l ON l.id = p.lista_espera_id
    WHERE p.id = p_pedido_id AND l.identificador = p_cliente_anonimo_id::text
      AND l.tipo_cliente = 'anonimo' FOR UPDATE OF p;
  END IF;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'No encontramos este pedido para tu cliente.' USING ERRCODE = '42501'; END IF;
  IF v_estado = 'recibido' THEN RETURN v_estado; END IF;
  IF v_estado <> 'entregado' THEN RAISE EXCEPTION 'El mozo todavía no marcó el pedido como entregado.' USING ERRCODE = '40001'; END IF;
  UPDATE public.pedidos SET estado = 'recibido' WHERE id = p_pedido_id;
  RETURN 'recibido';
END;
$$;

CREATE OR REPLACE FUNCTION public.solicitar_cuenta_pedido_cliente(
  p_pedido_id uuid,
  p_cliente_anonimo_id uuid DEFAULT NULL
)
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
  IF p_cliente_anonimo_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.usuarios
    WHERE auth_id = auth.uid() AND perfil::text = 'cliente registrado'
      AND estado_registro::text = 'aceptado';
    IF v_cliente_id IS NULL THEN RAISE EXCEPTION 'No se pudo validar tu cuenta de cliente.' USING ERRCODE = '42501'; END IF;
    SELECT estado, cuenta_solicitada_at INTO v_estado, v_solicitada FROM public.pedidos
    WHERE id = p_pedido_id AND cliente_id = v_cliente_id FOR UPDATE;
  ELSE
    SELECT p.estado, p.cuenta_solicitada_at INTO v_estado, v_solicitada
    FROM public.pedidos p JOIN public.lista_espera l ON l.id = p.lista_espera_id
    WHERE p.id = p_pedido_id AND l.identificador = p_cliente_anonimo_id::text
      AND l.tipo_cliente = 'anonimo' FOR UPDATE OF p;
  END IF;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'No encontramos este pedido para tu cliente.' USING ERRCODE = '42501'; END IF;
  IF v_estado <> 'recibido' THEN RAISE EXCEPTION 'Confirmá primero la recepción del pedido.' USING ERRCODE = '40001'; END IF;
  IF v_solicitada IS NULL THEN
    UPDATE public.pedidos SET cuenta_solicitada_at = now()
    WHERE id = p_pedido_id RETURNING cuenta_solicitada_at INTO v_solicitada;
  END IF;
  RETURN v_solicitada;
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_pedidos_mozo()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_perfil text; v_resultado jsonb;
BEGIN
  SELECT u.perfil::text INTO v_perfil FROM public.usuarios u
  WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado';
  IF v_perfil <> 'mozo' THEN RAISE EXCEPTION 'Solo un mozo puede consultar esta bandeja.' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'cliente_id', p.cliente_id, 'lista_espera_id', p.lista_espera_id,
    'mesa_id', p.mesa_id, 'estado', p.estado, 'total', p.total,
    'cuenta_solicitada_at', p.cuenta_solicitada_at, 'created_at', p.created_at,
    'mesas', jsonb_build_object('numero', m.numero, 'tipo', m.tipo, 'cantidad_comensales', m.cantidad_comensales),
    'usuarios', CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object('nombres', u.nombres, 'apellidos', u.apellidos) END,
    'cliente_nombre', COALESCE(NULLIF(l.nombre, ''), concat_ws(' ', u.nombres, u.apellidos), 'Cliente anónimo'),
    'pedido_detalles', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', d.id, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario,
      'estado_sector', d.estado_sector, 'productos', jsonb_build_object('nombre', pr.nombre, 'tipo', pr.tipo)
    ) ORDER BY pr.nombre), '[]'::jsonb)
      FROM public.pedido_detalles d JOIN public.productos pr ON pr.id = d.producto_id WHERE d.pedido_id = p.id)
  ) ORDER BY p.created_at DESC), '[]'::jsonb) INTO v_resultado
  FROM public.pedidos p JOIN public.mesas m ON m.id = p.mesa_id
  LEFT JOIN public.usuarios u ON u.id = p.cliente_id
  LEFT JOIN public.lista_espera l ON l.id = p.lista_espera_id;
  RETURN v_resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_recepcion_pedido_cliente(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.solicitar_cuenta_pedido_cliente(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_recepcion_pedido_cliente(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.solicitar_cuenta_pedido_cliente(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.obtener_pedidos_mozo() TO authenticated;

-- Si hay postres, también deben entrar en la cola de cocina al confirmar el pedido.
DO $$ BEGIN
  IF to_regclass('public.notificaciones_push') IS NOT NULL
    AND to_regprocedure('private.chido_encolar_push_para_perfiles(text,text,text,jsonb,public.tipo_perfil[],text)') IS NOT NULL THEN
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
          IF EXISTS (SELECT 1 FROM public.pedido_detalles d JOIN public.productos pr ON pr.id = d.producto_id
            WHERE d.pedido_id = NEW.id AND pr.tipo::text IN ('plato', 'postre')) THEN
            PERFORM private.chido_encolar_push_para_perfiles('pedido_confirmado', 'Nuevo pedido confirmado',
              'Hay platos o postres pendientes en cocina.', jsonb_build_object('ruta', '/cocina/pedidos'),
              ARRAY['cocinero']::public.tipo_perfil[], 'pedido_cocina:' || NEW.id::text || ':' || txid_current()::text);
          END IF;
          IF EXISTS (SELECT 1 FROM public.pedido_detalles d JOIN public.productos pr ON pr.id = d.producto_id
            WHERE d.pedido_id = NEW.id AND pr.tipo::text = 'bebida') THEN
            PERFORM private.chido_encolar_push_para_perfiles('pedido_confirmado', 'Nuevo pedido confirmado',
              'Hay bebidas pendientes en bar.', jsonb_build_object('ruta', '/bar/pedidos'),
              ARRAY['cantinero']::public.tipo_perfil[], 'pedido_bar:' || NEW.id::text || ':' || txid_current()::text);
          END IF;
        END IF;
        RETURN NEW;
      END;
      $body$;
    $fn$;
    EXECUTE 'DROP TRIGGER IF EXISTS chido_pedido_push ON public.pedidos';
    EXECUTE 'CREATE TRIGGER chido_pedido_push AFTER UPDATE OF estado ON public.pedidos FOR EACH ROW EXECUTE FUNCTION private.chido_notificar_estado_pedido()';
  END IF;
END $$;
