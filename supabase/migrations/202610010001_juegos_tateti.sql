ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS descuento_porcentaje integer NOT NULL DEFAULT 0
  CHECK (descuento_porcentaje IN (0, 10, 15, 20));

CREATE TABLE IF NOT EXISTS public.juego_intentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  juego text NOT NULL CHECK (juego IN ('ta_te_ti', 'memotest', 'ahorcado')),
  estado text NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'ganado', 'perdido', 'empate')),
  partida jsonb NOT NULL DEFAULT '{"tablero":[null,null,null,null,null,null,null,null,null],"turno":"cliente"}'::jsonb,
  descuento_otorgado integer NOT NULL DEFAULT 0 CHECK (descuento_otorgado IN (0, 10, 15, 20)),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (pedido_id, juego)
);

CREATE OR REPLACE FUNCTION public.iniciar_tateti(p_pedido_id uuid)
RETURNS public.juego_intentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intento public.juego_intentos;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.pedidos AS pedido
    JOIN public.usuarios AS cliente ON cliente.id = pedido.cliente_id
    WHERE pedido.id = p_pedido_id
      AND pedido.estado = 'confirmado'
      AND cliente.auth_id = auth.uid()
      AND cliente.perfil = 'cliente registrado'
  ) THEN
    RAISE EXCEPTION 'El juego sólo está disponible para clientes registrados con un pedido confirmado.';
  END IF;

  INSERT INTO public.juego_intentos (pedido_id, juego)
  VALUES (p_pedido_id, 'ta_te_ti')
  ON CONFLICT (pedido_id, juego) DO NOTHING;

  SELECT * INTO intento
  FROM public.juego_intentos
  WHERE pedido_id = p_pedido_id AND juego = 'ta_te_ti';

  RETURN intento;
END;
$$;

CREATE OR REPLACE FUNCTION public.guardar_tateti(p_pedido_id uuid, p_partida jsonb)
RETURNS public.juego_intentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intento public.juego_intentos;
BEGIN
  UPDATE public.juego_intentos
  SET partida = p_partida
  WHERE pedido_id = p_pedido_id
    AND juego = 'ta_te_ti'
    AND estado = 'en_curso'
  RETURNING * INTO intento;

  IF intento.id IS NULL THEN
    RAISE EXCEPTION 'No hay una partida de Ta-te-ti en curso.';
  END IF;

  RETURN intento;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolver_tateti(p_pedido_id uuid, p_estado text)
RETURNS public.juego_intentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intento public.juego_intentos;
  aplica_descuento boolean := false;
  filas_actualizadas integer := 0;
BEGIN
  IF p_estado NOT IN ('ganado', 'perdido', 'empate') THEN
    RAISE EXCEPTION 'El resultado de Ta-te-ti no es válido.';
  END IF;

  SELECT * INTO intento
  FROM public.juego_intentos
  WHERE pedido_id = p_pedido_id
    AND juego = 'ta_te_ti'
  FOR UPDATE;

  IF intento.id IS NULL OR intento.estado <> 'en_curso' THEN
    RAISE EXCEPTION 'La partida no se puede resolver.';
  END IF;

  IF p_estado = 'ganado' THEN
    UPDATE public.pedidos
    SET descuento_porcentaje = 10
    WHERE id = p_pedido_id
      AND descuento_porcentaje = 0;
    GET DIAGNOSTICS filas_actualizadas = ROW_COUNT;
    aplica_descuento := filas_actualizadas > 0;
  END IF;

  UPDATE public.juego_intentos
  SET estado = p_estado,
      descuento_otorgado = CASE WHEN aplica_descuento THEN 10 ELSE 0 END,
      resolved_at = now()
  WHERE id = intento.id
  RETURNING * INTO intento;

  RETURN intento;
END;
$$;

GRANT EXECUTE ON FUNCTION public.iniciar_tateti(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_tateti(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_tateti(uuid, text) TO authenticated;
