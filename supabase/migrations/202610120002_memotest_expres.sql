CREATE OR REPLACE FUNCTION public.estado_memotest_visible(p_intento public.juego_intentos, p_ocultar boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  reveladas integer[];
  emparejadas integer[];
  visibles integer[];
BEGIN
  SELECT COALESCE(array_agg(valor::integer), ARRAY[]::integer[]) INTO reveladas FROM jsonb_array_elements_text(COALESCE(p_intento.partida -> 'reveladas', '[]'::jsonb)) AS valor;
  SELECT COALESCE(array_agg(valor::integer), ARRAY[]::integer[]) INTO emparejadas FROM jsonb_array_elements_text(COALESCE(p_intento.partida -> 'emparejadas', '[]'::jsonb)) AS valor;
  visibles := emparejadas || reveladas;
  RETURN jsonb_build_object(
    'estado', p_intento.estado,
    'intentos', COALESCE((p_intento.partida ->> 'intentos')::integer, 0),
    'emparejadas', to_jsonb(emparejadas),
    'descuento_otorgado', p_intento.descuento_otorgado,
    'ocultar', p_ocultar,
    'cartas', (SELECT jsonb_agg(CASE WHEN indice = ANY(visibles) THEN p_intento.partida -> 'mazo' -> indice ELSE 'null'::jsonb END ORDER BY indice) FROM generate_series(0, 7) AS indice)
  );
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
  IF NOT EXISTS (SELECT 1 FROM public.pedidos pedido JOIN public.usuarios cliente ON cliente.id = pedido.cliente_id WHERE pedido.id = p_pedido_id AND pedido.estado = 'confirmado' AND cliente.auth_id = auth.uid() AND cliente.perfil = 'cliente registrado') THEN RAISE EXCEPTION 'El juego sólo está disponible para clientes registrados con un pedido confirmado.'; END IF;
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
  SELECT juego.* INTO intento FROM public.juego_intentos juego JOIN public.pedidos pedido ON pedido.id = juego.pedido_id JOIN public.usuarios cliente ON cliente.id = pedido.cliente_id WHERE juego.pedido_id = p_pedido_id AND juego.juego = 'memotest' AND cliente.auth_id = auth.uid() AND cliente.perfil = 'cliente registrado' FOR UPDATE;
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

GRANT EXECUTE ON FUNCTION public.iniciar_memotest(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.voltear_memotest(uuid, integer) TO authenticated;
