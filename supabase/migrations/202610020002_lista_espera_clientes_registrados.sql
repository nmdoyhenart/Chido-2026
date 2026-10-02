-- Unifica la lista de espera de clientes anónimos y clientes registrados.
-- Ejecutar después de 20260904_qr_mesas.sql.

ALTER TABLE public.lista_espera
  ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES public.usuarios(id);

ALTER TABLE public.lista_espera
  ALTER COLUMN usuario_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS identificador text,
  ADD COLUMN IF NOT EXISTS nombre text,
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS tipo_cliente text,
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'esperando',
  ADD COLUMN IF NOT EXISTS mesa_id uuid REFERENCES public.mesas(id),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Si había clientes registrados guardados con el esquema anterior, vincularlos
-- a usuarios.id cuando identificador contiene un UUID válido.
UPDATE public.lista_espera
SET usuario_id = identificador::uuid
WHERE usuario_id IS NULL
  AND tipo_cliente = 'registrado'
  AND identificador::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id::text = public.lista_espera.identificador);

-- La versión inicial hacía único todo usuario_id, incluso los que ya salieron.
ALTER TABLE public.lista_espera
  DROP CONSTRAINT IF EXISTS lista_espera_usuario_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS lista_espera_usuario_activo_unico
  ON public.lista_espera (usuario_id)
  WHERE usuario_id IS NOT NULL AND estado IN ('esperando', 'asignado');

CREATE UNIQUE INDEX IF NOT EXISTS lista_espera_identificador_activo_unico
  ON public.lista_espera (identificador)
  WHERE identificador IS NOT NULL AND estado IN ('esperando', 'asignado');

CREATE OR REPLACE FUNCTION public.ingresar_lista_espera_cliente()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_usuario public.usuarios%ROWTYPE;
  v_fila public.lista_espera%ROWTYPE;
BEGIN
  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE auth_id = auth.uid()
    AND perfil::text = 'cliente registrado'
    AND estado_registro::text = 'aceptado';
  IF v_usuario.id IS NULL THEN
    RAISE EXCEPTION 'Se requiere una cuenta de cliente registrada y aceptada.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.mesas WHERE cliente_id = v_usuario.id) THEN
    RAISE EXCEPTION 'Ya tenés una mesa asignada.' USING ERRCODE = '23505';
  END IF;

  DELETE FROM public.lista_espera
  WHERE usuario_id = v_usuario.id AND estado = 'eliminado';

  INSERT INTO public.lista_espera (usuario_id, identificador, nombre, foto_url, tipo_cliente, estado)
  VALUES (
    v_usuario.id,
    v_usuario.id::text,
    concat_ws(' ', v_usuario.nombres, v_usuario.apellidos),
    v_usuario.foto_perfil,
    'registrado',
    'esperando'
  )
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_fila FROM public.lista_espera
  WHERE usuario_id = v_usuario.id AND estado IN ('esperando', 'asignado')
  ORDER BY created_at DESC LIMIT 1;

  IF v_fila.id IS NULL THEN
    RAISE EXCEPTION 'No se pudo registrar tu ingreso en la lista de espera.';
  END IF;
  RETURN jsonb_build_object('id', v_fila.id, 'estado', v_fila.estado, 'mesa_id', v_fila.mesa_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.estado_lista_espera_cliente()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_usuario_id uuid;
  v_resultado jsonb;
BEGIN
  SELECT id INTO v_usuario_id FROM public.usuarios
  WHERE auth_id = auth.uid() AND perfil::text = 'cliente registrado'
    AND estado_registro::text = 'aceptado';
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere una cuenta de cliente registrada y aceptada.' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', l.id, 'estado', l.estado, 'mesa_id', l.mesa_id, 'mesa_numero', m.numero
  ) INTO v_resultado
  FROM public.lista_espera l
  LEFT JOIN public.mesas m ON m.id = l.mesa_id
  WHERE l.usuario_id = v_usuario_id AND l.estado IN ('esperando', 'asignado')
  ORDER BY l.created_at DESC LIMIT 1;

  RETURN COALESCE(v_resultado, jsonb_build_object('estado', 'sin_registro'));
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_lista_espera_metre()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_perfil text;
  v_resultado jsonb;
BEGIN
  SELECT perfil::text INTO v_perfil FROM public.usuarios
  WHERE auth_id = auth.uid() AND estado_registro::text = 'aceptado';
  IF v_perfil <> 'metre' THEN
    RAISE EXCEPTION 'Solo el metre puede consultar la lista de espera.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'identificador', COALESCE(l.identificador, l.usuario_id::text),
    'nombre', COALESCE(NULLIF(l.nombre, ''), concat_ws(' ', u.nombres, u.apellidos), 'Cliente'),
    'foto_url', COALESCE(l.foto_url, u.foto_perfil, ''),
    'tipo_cliente', COALESCE(l.tipo_cliente::text, CASE WHEN l.usuario_id IS NULL THEN 'anonimo' ELSE 'registrado' END),
    'estado', l.estado, 'mesa_id', l.mesa_id, 'created_at', l.created_at
  ) ORDER BY l.created_at), '[]'::jsonb) INTO v_resultado
  FROM public.lista_espera l
  LEFT JOIN public.usuarios u ON u.id = l.usuario_id
  WHERE l.estado = 'esperando'
    AND (l.usuario_id IS NULL OR (u.perfil::text = 'cliente registrado' AND u.estado_registro::text = 'aceptado'));
  RETURN v_resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.asignar_mesa_lista_espera(p_lista_id uuid, p_mesa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_perfil text;
  v_usuario_id uuid;
BEGIN
  SELECT perfil::text INTO v_perfil FROM public.usuarios
  WHERE auth_id = auth.uid() AND estado_registro::text = 'aceptado';
  IF v_perfil <> 'metre' THEN
    RAISE EXCEPTION 'Solo el metre puede asignar mesas.' USING ERRCODE = '42501';
  END IF;

  SELECT usuario_id INTO v_usuario_id FROM public.lista_espera
  WHERE id = p_lista_id AND estado = 'esperando' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El cliente ya no está esperando.' USING ERRCODE = '40001';
  END IF;

  PERFORM 1 FROM public.mesas
  WHERE id = p_mesa_id AND disponibilidad::text = 'vacía' AND cliente_id IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La mesa ya no está disponible.' USING ERRCODE = '40001';
  END IF;

  UPDATE public.mesas
  SET cliente_id = v_usuario_id, disponibilidad = 'ocupada', qr_confirmado_at = NULL
  WHERE id = p_mesa_id;
  UPDATE public.lista_espera
  SET mesa_id = p_mesa_id, estado = 'asignado'
  WHERE id = p_lista_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_de_lista_espera_metre(p_lista_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_perfil text;
BEGIN
  SELECT perfil::text INTO v_perfil FROM public.usuarios
  WHERE auth_id = auth.uid() AND estado_registro::text = 'aceptado';
  IF v_perfil <> 'metre' THEN
    RAISE EXCEPTION 'Solo el metre puede quitar clientes de la lista.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.lista_espera SET estado = 'eliminado'
  WHERE id = p_lista_id AND estado = 'esperando';
  IF NOT FOUND THEN RAISE EXCEPTION 'El cliente ya no está esperando.' USING ERRCODE = '40001'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ingresar_lista_espera_cliente() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.estado_lista_espera_cliente() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obtener_lista_espera_metre() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.asignar_mesa_lista_espera(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eliminar_de_lista_espera_metre(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ingresar_lista_espera_cliente() TO authenticated;
GRANT EXECUTE ON FUNCTION public.estado_lista_espera_cliente() TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_lista_espera_metre() TO authenticated;
GRANT EXECUTE ON FUNCTION public.asignar_mesa_lista_espera(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_de_lista_espera_metre(uuid) TO authenticated;
