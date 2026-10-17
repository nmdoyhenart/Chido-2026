CREATE OR REPLACE FUNCTION private.chido_juegos_habilitados(p_pedido_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pedidos AS pedido
    JOIN public.usuarios AS cliente ON cliente.id = pedido.cliente_id
    WHERE pedido.id = p_pedido_id
      AND pedido.estado::text IN ('confirmado', 'en_preparacion', 'entregado', 'recibido')
      AND pedido.cuenta_solicitada_at IS NULL
      AND cliente.auth_id = auth.uid()
      AND cliente.perfil = 'cliente registrado'
  );
$$;

REVOKE ALL ON FUNCTION private.chido_juegos_habilitados(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.iniciar_tateti(p_pedido_id uuid)
RETURNS public.juego_intentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE intento public.juego_intentos;
BEGIN
  IF NOT private.chido_juegos_habilitados(p_pedido_id) THEN
    RAISE EXCEPTION 'Los juegos están disponibles desde la confirmación del pedido hasta solicitar la cuenta.';
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
DECLARE intento public.juego_intentos;
BEGIN
  IF NOT private.chido_juegos_habilitados(p_pedido_id) THEN
    RAISE EXCEPTION 'Los juegos ya no están disponibles para este pedido.';
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
  IF NOT private.chido_juegos_habilitados(p_pedido_id) THEN
    RAISE EXCEPTION 'Los juegos ya no están disponibles para este pedido.';
  END IF;

  SELECT * INTO intento
  FROM public.juego_intentos
  WHERE pedido_id = p_pedido_id
    AND juego = 'ta_te_ti'
  FOR UPDATE;

  IF intento.id IS NULL OR intento.estado <> 'en_curso' THEN
    RAISE EXCEPTION 'La partida no se puede resolver.';
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
    WHERE id = p_pedido_id AND descuento_porcentaje = 0;
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

CREATE OR REPLACE FUNCTION public.iniciar_memotest(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE intento public.juego_intentos; mazo jsonb;
BEGIN
  IF NOT private.chido_juegos_habilitados(p_pedido_id) THEN
    RAISE EXCEPTION 'Los juegos están disponibles desde la confirmación del pedido hasta solicitar la cuenta.';
  END IF;
  SELECT jsonb_agg(carta) INTO mazo FROM (SELECT carta FROM unnest(ARRAY['taco','chile','sombrero','cupon','taco','chile','sombrero','cupon']) AS carta ORDER BY random()) cartas;
  INSERT INTO public.juego_intentos (pedido_id, juego, partida) VALUES (p_pedido_id, 'memotest', jsonb_build_object('mazo', mazo, 'reveladas', '[]'::jsonb, 'emparejadas', '[]'::jsonb, 'intentos', 0)) ON CONFLICT (pedido_id, juego) DO NOTHING;
  SELECT * INTO intento FROM public.juego_intentos WHERE pedido_id = p_pedido_id AND juego = 'memotest';
  RETURN public.estado_memotest_visible(intento);
END;
$$;

CREATE OR REPLACE FUNCTION public.voltear_memotest(p_pedido_id uuid, p_indice integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE intento public.juego_intentos; reveladas integer[]; emparejadas integer[]; primera integer; intentos integer; coincide boolean; aplica boolean := false; filas integer := 0;
BEGIN
  IF p_indice NOT BETWEEN 0 AND 7 THEN RAISE EXCEPTION 'La carta no es válida.'; END IF;
  IF NOT private.chido_juegos_habilitados(p_pedido_id) THEN RAISE EXCEPTION 'Los juegos ya no están disponibles para este pedido.'; END IF;
  SELECT juego.* INTO intento FROM public.juego_intentos juego WHERE juego.pedido_id = p_pedido_id AND juego.juego = 'memotest' FOR UPDATE;
  IF intento.id IS NULL OR intento.estado <> 'en_curso' THEN RAISE EXCEPTION 'La partida no se puede continuar.'; END IF;
  SELECT COALESCE(array_agg(valor::integer), ARRAY[]::integer[]) INTO reveladas FROM jsonb_array_elements_text(intento.partida -> 'reveladas') AS valor;
  SELECT COALESCE(array_agg(valor::integer), ARRAY[]::integer[]) INTO emparejadas FROM jsonb_array_elements_text(intento.partida -> 'emparejadas') AS valor;
  IF p_indice = ANY(emparejadas) OR p_indice = ANY(reveladas) THEN RAISE EXCEPTION 'Esa carta ya está visible.'; END IF;
  IF cardinality(reveladas) = 2 THEN reveladas := ARRAY[]::integer[]; END IF;
  IF cardinality(reveladas) = 0 THEN
    reveladas := ARRAY[p_indice];
    UPDATE public.juego_intentos SET partida = jsonb_set(intento.partida, '{reveladas}', to_jsonb(reveladas)) WHERE id = intento.id RETURNING * INTO intento;
    RETURN public.estado_memotest_visible(intento);
  END IF;
  primera := reveladas[1]; intentos := COALESCE((intento.partida ->> 'intentos')::integer, 0) + 1;
  coincide := (intento.partida -> 'mazo' ->> primera) = (intento.partida -> 'mazo' ->> p_indice);
  reveladas := ARRAY[primera, p_indice];
  IF coincide THEN emparejadas := emparejadas || reveladas; reveladas := ARRAY[]::integer[]; END IF;
  UPDATE public.juego_intentos SET partida = jsonb_set(jsonb_set(jsonb_set(intento.partida, '{reveladas}', to_jsonb(reveladas)), '{emparejadas}', to_jsonb(emparejadas)), '{intentos}', to_jsonb(intentos)) WHERE id = intento.id RETURNING * INTO intento;
  IF cardinality(emparejadas) = 8 THEN
    UPDATE public.pedidos SET descuento_porcentaje = 15 WHERE id = p_pedido_id AND descuento_porcentaje = 0; GET DIAGNOSTICS filas = ROW_COUNT; aplica := filas > 0;
    UPDATE public.juego_intentos SET estado = 'ganado', descuento_otorgado = CASE WHEN aplica THEN 15 ELSE 0 END, resolved_at = now() WHERE id = intento.id RETURNING * INTO intento;
  ELSIF intentos >= 6 THEN
    UPDATE public.juego_intentos SET estado = 'perdido', resolved_at = now() WHERE id = intento.id RETURNING * INTO intento;
  END IF;
  RETURN public.estado_memotest_visible(intento, NOT coincide AND intento.estado = 'en_curso');
END;
$$;

CREATE OR REPLACE FUNCTION public.iniciar_ahorcado(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE intento public.juego_intentos; partida_inicial jsonb;
BEGIN
  IF NOT private.chido_juegos_habilitados(p_pedido_id) THEN
    RAISE EXCEPTION 'Los juegos están disponibles desde la confirmación del pedido hasta solicitar la cuenta.';
  END IF;
  SELECT jsonb_build_object('palabra', palabra, 'categoria', categoria, 'letras_intentadas', '[]'::jsonb, 'errores', 0)
  INTO partida_inicial
  FROM (VALUES
    ('TACO', 'Comida mexicana'), ('NACHOS', 'Comida mexicana'), ('BURRITO', 'Comida mexicana'), ('FAJITAS', 'Comida mexicana'), ('QUESADILLA', 'Comida mexicana'), ('GUACAMOLE', 'Comida mexicana'), ('ENCHILADA', 'Comida mexicana'), ('CHILAQUILES', 'Comida mexicana'), ('CHIMICHANGA', 'Comida mexicana'), ('HUITLACOCHE', 'Comida mexicana'), ('ESQUITES', 'Comida mexicana'), ('TLACOYOS', 'Comida mexicana'), ('MESA', 'Salón'), ('MOZO', 'Salón'), ('COCINA', 'Salón'), ('COMENSALES', 'Salón'), ('CUBIERTOS', 'Salón'), ('SERVILLETA', 'Salón'), ('SOBREMESA', 'Salón'), ('PROPINA', 'Cuenta'), ('CUENTA', 'Cuenta'), ('FACTURA', 'Cuenta'), ('DESCUENTO', 'Cuenta')
  ) AS palabras(palabra, categoria)
  ORDER BY random() LIMIT 1;
  INSERT INTO public.juego_intentos (pedido_id, juego, partida) VALUES (p_pedido_id, 'ahorcado', partida_inicial) ON CONFLICT (pedido_id, juego) DO NOTHING;
  SELECT * INTO intento FROM public.juego_intentos WHERE pedido_id = p_pedido_id AND juego = 'ahorcado';
  RETURN public.estado_ahorcado_visible(intento);
END;
$$;

CREATE OR REPLACE FUNCTION public.intentar_letra_ahorcado(p_pedido_id uuid, p_letra text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intento public.juego_intentos;
  letras text[];
  letra text;
  palabra text;
  errores integer;
  gano boolean;
  perdio boolean;
  aplica_descuento boolean := false;
  filas integer := 0;
BEGIN
  letra := upper(trim(p_letra));
  IF letra !~ '^[A-Z]$' THEN RAISE EXCEPTION 'La letra no es válida.'; END IF;
  IF NOT private.chido_juegos_habilitados(p_pedido_id) THEN RAISE EXCEPTION 'Los juegos ya no están disponibles para este pedido.'; END IF;
  SELECT juego.* INTO intento FROM public.juego_intentos juego WHERE juego.pedido_id = p_pedido_id AND juego.juego = 'ahorcado' FOR UPDATE;
  IF intento.id IS NULL OR intento.estado <> 'en_curso' THEN RAISE EXCEPTION 'La partida no se puede continuar.'; END IF;
  SELECT COALESCE(array_agg(valor), ARRAY[]::text[]) INTO letras FROM jsonb_array_elements_text(intento.partida -> 'letras_intentadas') AS valor;
  IF letra = ANY(letras) THEN RAISE EXCEPTION 'Esa letra ya fue intentada.'; END IF;
  palabra := intento.partida ->> 'palabra';
  letras := letras || letra;
  errores := COALESCE((intento.partida ->> 'errores')::integer, 0) + CASE WHEN position(letra IN palabra) = 0 THEN 1 ELSE 0 END;
  gano := NOT EXISTS (SELECT 1 FROM regexp_split_to_table(palabra, '') AS caracteres(letra_palabra) WHERE letra_palabra <> ALL(letras));
  perdio := errores >= 6;
  UPDATE public.juego_intentos SET partida = jsonb_build_object('palabra', palabra, 'categoria', intento.partida ->> 'categoria', 'letras_intentadas', to_jsonb(letras), 'errores', errores) WHERE id = intento.id RETURNING * INTO intento;
  IF gano THEN
    UPDATE public.pedidos SET descuento_porcentaje = 20 WHERE id = p_pedido_id AND descuento_porcentaje = 0;
    GET DIAGNOSTICS filas = ROW_COUNT;
    aplica_descuento := filas > 0;
  END IF;
  IF gano OR perdio THEN
    UPDATE public.juego_intentos SET estado = CASE WHEN gano THEN 'ganado' ELSE 'perdido' END, descuento_otorgado = CASE WHEN aplica_descuento THEN 20 ELSE 0 END, resolved_at = now() WHERE id = intento.id RETURNING * INTO intento;
  END IF;
  RETURN public.estado_ahorcado_visible(intento);
END;
$$;
