-- Punto 22: el cliente informa el pago y sólo un mozo puede confirmarlo y liberar la mesa.

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
  IF NEW.estado NOT IN ('pago_informado', 'pagado') OR NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  SELECT numero INTO v_mesa_num FROM public.mesas WHERE id = NEW.mesa_id;
  IF v_mesa_num IS NOT NULL THEN
    v_mesa_texto := 'Mesa ' || v_mesa_num::text;
  END IF;

  IF NEW.estado = 'pago_informado' THEN
    INSERT INTO public.notificaciones_push (usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia)
    SELECT
      u.id,
      'pago_recibido',
      'Pago informado',
      'El cliente de ' || v_mesa_texto || ' informó el pago de $' || COALESCE(NEW.total, 0)::text || '. Espera tu confirmación.',
      jsonb_build_object('ruta', '/mozo/pedidos', 'pedidoId', NEW.id),
      'pago_informado:' || NEW.id::text || ':' || u.id::text
    FROM public.usuarios u
    WHERE u.perfil::text = 'mozo'
    ON CONFLICT (clave_idempotencia) DO NOTHING;
  ELSE
    INSERT INTO public.notificaciones_push (usuario_id, evento, titulo, cuerpo, datos, clave_idempotencia)
    SELECT
      u.id,
      'pago_confirmado',
      'Pago confirmado',
      'El mozo confirmó el pago de ' || v_mesa_texto || ' y la mesa quedó liberada.',
      jsonb_build_object('ruta', '/mesas/gestion', 'pedidoId', NEW.id),
      'pago_confirmado:' || NEW.id::text || ':' || u.id::text
    FROM public.usuarios u
    WHERE u.perfil::text IN ('dueño', 'supervisor')
    ON CONFLICT (clave_idempotencia) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_liberacion_mesa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.disponibilidad::text <> 'vacía' AND NEW.disponibilidad::text = 'vacía' THEN
    IF EXISTS (
      SELECT 1
      FROM public.pedidos p
      WHERE p.mesa_id = OLD.id
        AND COALESCE(p.estado, '') NOT IN ('pagado', 'finalizado', 'cancelado')
    ) THEN
      RAISE EXCEPTION 'No se puede liberar la mesa: tiene un pedido en curso o pendiente de pago.'
        USING ERRCODE = '55000';
    END IF;

    UPDATE public.lista_espera
    SET estado = 'eliminado', mesa_id = NULL
    WHERE mesa_id = OLD.id AND estado::text = 'asignado';

    NEW.cliente_id := NULL;
    NEW.qr_confirmado_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_cuenta_pedido_cliente(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cliente_id uuid;
  v_resultado jsonb;
BEGIN
  SELECT id INTO v_cliente_id
  FROM public.usuarios
  WHERE auth_id = auth.uid()
    AND perfil::text = 'cliente registrado'
    AND estado_registro::text = 'aceptado';

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo validar tu cuenta de cliente.' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'pedido_id', p.id,
    'mesa_id', p.mesa_id,
    'mesa_numero', m.numero,
    'estado', p.estado,
    'total', p.total,
    'descuento_porcentaje', p.descuento_porcentaje,
    'propina_porcentaje', p.propina_porcentaje,
    'cuenta_solicitada_at', m.cuenta_solicitada_at,
    'detalles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id,
        'cantidad', d.cantidad,
        'precio_unitario', d.precio_unitario,
        'producto', jsonb_build_object(
          'id', pr.id, 'nombre', pr.nombre, 'tipo', pr.tipo, 'fotos', pr.fotos
        )
      ) ORDER BY d.id)
      FROM public.pedido_detalles d
      JOIN public.productos pr ON pr.id = d.producto_id
      WHERE d.pedido_id = p.id
    ), '[]'::jsonb)
  ) INTO v_resultado
  FROM public.pedidos p
  JOIN public.mesas m ON m.id = p.mesa_id
  WHERE p.id = p_pedido_id AND p.cliente_id = v_cliente_id;

  IF v_resultado IS NULL THEN
    RAISE EXCEPTION 'No encontramos este pedido para tu cuenta.' USING ERRCODE = '42501';
  END IF;
  RETURN v_resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_cuenta_pedido_anonimo(p_cliente_anonimo_id uuid, p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_resultado jsonb;
BEGIN
  SELECT jsonb_build_object(
    'pedido_id', p.id,
    'mesa_id', p.mesa_id,
    'mesa_numero', m.numero,
    'estado', p.estado,
    'total', p.total,
    'descuento_porcentaje', p.descuento_porcentaje,
    'propina_porcentaje', p.propina_porcentaje,
    'cuenta_solicitada_at', m.cuenta_solicitada_at,
    'detalles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id,
        'cantidad', d.cantidad,
        'precio_unitario', d.precio_unitario,
        'producto', jsonb_build_object(
          'id', pr.id, 'nombre', pr.nombre, 'tipo', pr.tipo, 'fotos', pr.fotos
        )
      ) ORDER BY d.id)
      FROM public.pedido_detalles d
      JOIN public.productos pr ON pr.id = d.producto_id
      WHERE d.pedido_id = p.id
    ), '[]'::jsonb)
  ) INTO v_resultado
  FROM public.pedidos p
  JOIN public.mesas m ON m.id = p.mesa_id
  JOIN public.lista_espera l ON l.id = p.lista_espera_id
  WHERE p.id = p_pedido_id
    AND l.identificador = p_cliente_anonimo_id::text
    AND l.tipo_cliente::text = 'anonimo';

  IF v_resultado IS NULL THEN
    RAISE EXCEPTION 'No encontramos este pedido para tu sesión.' USING ERRCODE = '42501';
  END IF;
  RETURN v_resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_propina_pedido_cliente(p_pedido_id uuid, p_porcentaje integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_cliente_id uuid; v_propina integer;
BEGIN
  IF p_porcentaje NOT IN (0, 5, 10, 15, 20) THEN
    RAISE EXCEPTION 'La propina indicada no es válida.' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO v_cliente_id FROM public.usuarios
  WHERE auth_id = auth.uid() AND perfil::text = 'cliente registrado' AND estado_registro::text = 'aceptado';
  UPDATE public.pedidos SET propina_porcentaje = p_porcentaje
  WHERE id = p_pedido_id AND cliente_id = v_cliente_id AND estado = 'recibido'
  RETURNING propina_porcentaje INTO v_propina;
  IF v_propina IS NULL THEN RAISE EXCEPTION 'No se puede guardar la propina para este pedido.' USING ERRCODE = '42501'; END IF;
  RETURN v_propina;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_propina_pedido_anonimo(p_cliente_anonimo_id uuid, p_pedido_id uuid, p_porcentaje integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_propina integer;
BEGIN
  IF p_porcentaje NOT IN (0, 5, 10, 15, 20) THEN
    RAISE EXCEPTION 'La propina indicada no es válida.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.pedidos p SET propina_porcentaje = p_porcentaje
  FROM public.lista_espera l
  WHERE p.id = p_pedido_id AND p.lista_espera_id = l.id
    AND l.identificador = p_cliente_anonimo_id::text AND l.tipo_cliente::text = 'anonimo'
    AND p.estado = 'recibido'
  RETURNING p.propina_porcentaje INTO v_propina;
  IF v_propina IS NULL THEN RAISE EXCEPTION 'No se puede guardar la propina para este pedido.' USING ERRCODE = '42501'; END IF;
  RETURN v_propina;
END;
$$;

CREATE OR REPLACE FUNCTION public.informar_pago_pedido_cliente(p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_cliente_id uuid; v_mesa_id uuid;
BEGIN
  SELECT id INTO v_cliente_id FROM public.usuarios
  WHERE auth_id = auth.uid() AND perfil::text = 'cliente registrado' AND estado_registro::text = 'aceptado';
  UPDATE public.pedidos p
  SET estado = 'pago_informado',
      total = COALESCE((
        SELECT round(
          COALESCE(sum(d.cantidad * d.precio_unitario), 0)
          * (100 - p.descuento_porcentaje) / 100
          * (100 + p.propina_porcentaje) / 100,
          2
        )
        FROM public.pedido_detalles d
        WHERE d.pedido_id = p.id
      ), 0)
  WHERE p.id = p_pedido_id AND p.cliente_id = v_cliente_id AND p.estado = 'recibido' AND p.propina_porcentaje IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se puede informar el pago para este pedido.' USING ERRCODE = '42501'; END IF;
  SELECT mesa_id INTO v_mesa_id FROM public.pedidos WHERE id = p_pedido_id;
  UPDATE public.mesas SET cuenta_solicitada_at = COALESCE(cuenta_solicitada_at, now()) WHERE id = v_mesa_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.informar_pago_pedido_anonimo(p_cliente_anonimo_id uuid, p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_mesa_id uuid;
BEGIN
  UPDATE public.pedidos p
  SET estado = 'pago_informado',
      total = COALESCE((
        SELECT round(
          COALESCE(sum(d.cantidad * d.precio_unitario), 0)
          * (100 - p.descuento_porcentaje) / 100
          * (100 + p.propina_porcentaje) / 100,
          2
        )
        FROM public.pedido_detalles d
        WHERE d.pedido_id = p.id
      ), 0)
  FROM public.lista_espera l
  WHERE p.id = p_pedido_id AND p.lista_espera_id = l.id
    AND l.identificador = p_cliente_anonimo_id::text AND l.tipo_cliente::text = 'anonimo'
    AND p.estado = 'recibido' AND p.propina_porcentaje IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se puede informar el pago para este pedido.' USING ERRCODE = '42501'; END IF;
  SELECT mesa_id INTO v_mesa_id FROM public.pedidos WHERE id = p_pedido_id;
  UPDATE public.mesas SET cuenta_solicitada_at = COALESCE(cuenta_solicitada_at, now()) WHERE id = v_mesa_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_solicitudes_cuenta_mozo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_perfil text; v_resultado jsonb;
BEGIN
  SELECT perfil::text INTO v_perfil FROM public.usuarios
  WHERE auth_id = auth.uid() AND estado_registro::text = 'aceptado';
  IF v_perfil IS DISTINCT FROM 'mozo' THEN
    RAISE EXCEPTION 'Solo un mozo puede consultar los pagos informados.' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'pedido_id', p.id, 'mesa_id', m.id, 'numero', m.numero,
    'solicitada_at', m.cuenta_solicitada_at,
    'cliente', COALESCE(NULLIF(l.nombre, ''), concat_ws(' ', u.nombres, u.apellidos), 'Cliente')
  ) ORDER BY m.cuenta_solicitada_at), '[]'::jsonb)
  INTO v_resultado
  FROM public.pedidos p
  JOIN public.mesas m ON m.id = p.mesa_id
  LEFT JOIN public.usuarios u ON u.id = p.cliente_id
  LEFT JOIN public.lista_espera l ON l.id = p.lista_espera_id
  WHERE p.estado = 'pago_informado' AND m.disponibilidad::text = 'ocupada';
  RETURN v_resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_pago_mozo(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_perfil text; v_mesa public.mesas%ROWTYPE;
BEGIN
  SELECT perfil::text INTO v_perfil FROM public.usuarios
  WHERE auth_id = auth.uid() AND estado_registro::text = 'aceptado';
  IF v_perfil IS DISTINCT FROM 'mozo' THEN
    RAISE EXCEPTION 'Solo un mozo puede confirmar el pago.' USING ERRCODE = '42501';
  END IF;

  SELECT m.* INTO v_mesa
  FROM public.pedidos p
  JOIN public.mesas m ON m.id = p.mesa_id
  WHERE p.id = p_pedido_id AND p.estado = 'pago_informado'
  FOR UPDATE OF p, m;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Este pago ya fue confirmado o no está disponible.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.pedidos SET estado = 'pagado' WHERE id = p_pedido_id;
  UPDATE public.mesas
  SET disponibilidad = 'vacía', cliente_id = NULL, qr_confirmado_at = NULL
  WHERE id = v_mesa.id
  RETURNING * INTO v_mesa;

  RETURN jsonb_build_object('pedido_id', p_pedido_id, 'mesa_id', v_mesa.id, 'mesa_numero', v_mesa.numero, 'liberada', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.consultar_disponibilidad_mesa_qr(p_mesa_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_mesa public.mesas%ROWTYPE;
BEGIN
  SELECT * INTO v_mesa FROM public.mesas WHERE id = p_mesa_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'La mesa indicada no existe.' USING ERRCODE = 'P0002'; END IF;
  RETURN jsonb_build_object('id', v_mesa.id, 'numero', v_mesa.numero, 'disponibilidad', v_mesa.disponibilidad);
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_cuenta_pedido_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obtener_cuenta_pedido_anonimo(uuid, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.registrar_propina_pedido_cliente(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.registrar_propina_pedido_anonimo(uuid, uuid, integer) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.informar_pago_pedido_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.informar_pago_pedido_anonimo(uuid, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.confirmar_pago_mozo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consultar_disponibilidad_mesa_qr(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_cuenta_pedido_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_cuenta_pedido_anonimo(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.registrar_propina_pedido_cliente(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_propina_pedido_anonimo(uuid, uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.informar_pago_pedido_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.informar_pago_pedido_anonimo(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.confirmar_pago_mozo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_disponibilidad_mesa_qr(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_estado_pedido_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_estado_pedido_anonimo(uuid, uuid) TO anon;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a todos en pedidos" ON public.pedidos;
CREATE POLICY "Lectura de pedidos" ON public.pedidos
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total mesas" ON public.mesas;
CREATE POLICY "Lectura de mesas" ON public.mesas
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Gestion de mesas autorizada" ON public.mesas
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado'
      AND u.perfil::text IN ('dueño', 'supervisor', 'metre')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado'
      AND u.perfil::text IN ('dueño', 'supervisor', 'metre')
  ));

ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clientes anonimos pueden anotarse" ON public.lista_espera;
DROP POLICY IF EXISTS "Cualquiera puede actualizar la lista de espera" ON public.lista_espera;
DROP POLICY IF EXISTS "Cualquiera puede ver la lista de espera" ON public.lista_espera;
CREATE POLICY "Lectura de lista de espera" ON public.lista_espera
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Alta anonima en lista de espera" ON public.lista_espera
  FOR INSERT TO anon WITH CHECK (tipo_cliente::text = 'anonimo' AND estado::text = 'esperando');
CREATE POLICY "Alta propia en lista de espera" ON public.lista_espera
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = usuario_id AND u.auth_id = auth.uid()
        AND u.perfil::text = 'cliente registrado' AND u.estado_registro::text = 'aceptado'
    )
  );
CREATE POLICY "Actualizacion propia o de gestion de lista" ON public.lista_espera
  FOR UPDATE TO authenticated
  USING (
    usuario_id IN (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado'
        AND u.perfil::text IN ('dueño', 'supervisor', 'metre')
    )
  )
  WITH CHECK (
    usuario_id IN (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado'
        AND u.perfil::text IN ('dueño', 'supervisor', 'metre')
    )
  );
CREATE POLICY "Eliminacion de lista por gestion" ON public.lista_espera
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_id = auth.uid() AND u.estado_registro::text = 'aceptado'
      AND u.perfil::text IN ('dueño', 'supervisor', 'metre')
  ));
