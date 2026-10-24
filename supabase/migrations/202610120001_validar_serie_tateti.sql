ALTER TABLE public.juego_intentos
  ALTER COLUMN partida SET DEFAULT '{"tablero":[null,null,null,null,null,null,null,null,null],"turno":"cliente","ronda":1,"puntosCliente":0,"puntosAplicacion":0,"estadoRonda":"en_curso"}'::jsonb;

CREATE OR REPLACE FUNCTION public.guardar_tateti(p_pedido_id uuid, p_partida jsonb)
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
      AND cliente.auth_id = auth.uid()
      AND cliente.perfil = 'cliente registrado'
  ) THEN
    RAISE EXCEPTION 'No tenés autorización para guardar esta partida.';
  END IF;

  IF COALESCE(jsonb_typeof(p_partida), '') <> 'object'
     OR COALESCE(jsonb_typeof(p_partida -> 'tablero'), '') <> 'array'
     OR jsonb_array_length(
       CASE WHEN jsonb_typeof(p_partida -> 'tablero') = 'array' THEN p_partida -> 'tablero' ELSE '[]'::jsonb END
     ) <> 9
     OR COALESCE(p_partida ->> 'turno', '') NOT IN ('cliente', 'aplicacion')
     OR COALESCE(p_partida ->> 'ronda', '') !~ '^[1-5]$'
     OR COALESCE(p_partida ->> 'puntosCliente', '') !~ '^[0-3]$'
     OR COALESCE(p_partida ->> 'puntosAplicacion', '') !~ '^[0-3]$'
     OR COALESCE(p_partida ->> 'estadoRonda', '') NOT IN ('en_curso', 'cliente', 'aplicacion', 'empate') THEN
    RAISE EXCEPTION 'El estado de Ta-te-ti no es válido.';
  END IF;

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
  puntos_cliente integer;
  puntos_aplicacion integer;
  ronda integer;
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.pedidos AS pedido
    JOIN public.usuarios AS cliente ON cliente.id = pedido.cliente_id
    WHERE pedido.id = p_pedido_id
      AND cliente.auth_id = auth.uid()
      AND cliente.perfil = 'cliente registrado'
  ) THEN
    RAISE EXCEPTION 'No tenés autorización para resolver esta partida.';
  END IF;

  puntos_cliente := CASE WHEN COALESCE(intento.partida ->> 'puntosCliente', '') ~ '^\d+$' THEN (intento.partida ->> 'puntosCliente')::integer ELSE 0 END;
  puntos_aplicacion := CASE WHEN COALESCE(intento.partida ->> 'puntosAplicacion', '') ~ '^\d+$' THEN (intento.partida ->> 'puntosAplicacion')::integer ELSE 0 END;
  ronda := CASE WHEN COALESCE(intento.partida ->> 'ronda', '') ~ '^\d+$' THEN (intento.partida ->> 'ronda')::integer ELSE 0 END;

  IF p_estado = 'ganado' AND NOT (puntos_cliente >= 3 AND puntos_aplicacion < 3) THEN
    RAISE EXCEPTION 'El descuento requiere ganar tres rondas.';
  ELSIF p_estado = 'perdido' AND NOT (puntos_aplicacion >= 3 AND puntos_cliente < 3) THEN
    RAISE EXCEPTION 'El marcador no corresponde a una derrota.';
  ELSIF p_estado = 'empate' AND NOT (ronda = 5 AND puntos_cliente < 3 AND puntos_aplicacion < 3) THEN
    RAISE EXCEPTION 'La serie debe completar cinco rondas sin tres victorias.';
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
