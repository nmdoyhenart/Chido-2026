CREATE OR REPLACE FUNCTION public.estado_ahorcado_visible(p_intento public.juego_intentos)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  letras text[];
  palabra text;
BEGIN
  palabra := p_intento.partida ->> 'palabra';
  SELECT COALESCE(array_agg(valor), ARRAY[]::text[])
  INTO letras
  FROM jsonb_array_elements_text(COALESCE(p_intento.partida -> 'letras_intentadas', '[]'::jsonb)) AS valor;

  RETURN jsonb_build_object(
    'estado', p_intento.estado,
    'palabra', (
      SELECT jsonb_agg(
        CASE WHEN p_intento.estado <> 'en_curso' OR letra = ANY(letras) THEN to_jsonb(letra) ELSE 'null'::jsonb END
        ORDER BY indice
      )
      FROM regexp_split_to_table(palabra, '') WITH ORDINALITY AS caracteres(letra, indice)
    ),
    'palabra_resuelta', CASE WHEN p_intento.estado <> 'en_curso' THEN palabra ELSE NULL END,
    'categoria', p_intento.partida ->> 'categoria',
    'letras_intentadas', to_jsonb(letras),
    'errores', COALESCE((p_intento.partida ->> 'errores')::integer, 0),
    'max_errores', 6,
    'descuento_otorgado', p_intento.descuento_otorgado
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.iniciar_ahorcado(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intento public.juego_intentos;
  partida_inicial jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.pedidos pedido
    JOIN public.usuarios cliente ON cliente.id = pedido.cliente_id
    WHERE pedido.id = p_pedido_id
      AND pedido.estado = 'confirmado'
      AND cliente.auth_id = auth.uid()
      AND cliente.perfil = 'cliente registrado'
  ) THEN
    RAISE EXCEPTION 'El juego sólo está disponible para clientes registrados con un pedido confirmado.';
  END IF;

  SELECT jsonb_build_object('palabra', palabra, 'categoria', categoria, 'letras_intentadas', '[]'::jsonb, 'errores', 0)
  INTO partida_inicial
  FROM (
    VALUES
      ('TACO', 'Comida mexicana'), ('NACHOS', 'Comida mexicana'), ('BURRITO', 'Comida mexicana'),
      ('FAJITAS', 'Comida mexicana'), ('QUESADILLA', 'Comida mexicana'), ('GUACAMOLE', 'Comida mexicana'),
      ('ENCHILADA', 'Comida mexicana'), ('CHILAQUILES', 'Comida mexicana'), ('CHIMICHANGA', 'Comida mexicana'),
      ('HUITLACOCHE', 'Comida mexicana'), ('ESQUITES', 'Comida mexicana'), ('TLACOYOS', 'Comida mexicana'),
      ('MESA', 'Salón'), ('MOZO', 'Salón'), ('COCINA', 'Salón'), ('COMENSALES', 'Salón'),
      ('CUBIERTOS', 'Salón'), ('SERVILLETA', 'Salón'), ('SOBREMESA', 'Salón'), ('PROPINA', 'Cuenta'),
      ('CUENTA', 'Cuenta'), ('FACTURA', 'Cuenta'), ('DESCUENTO', 'Cuenta')
  ) AS palabras(palabra, categoria)
  ORDER BY random()
  LIMIT 1;

  INSERT INTO public.juego_intentos (pedido_id, juego, partida)
  VALUES (p_pedido_id, 'ahorcado', partida_inicial)
  ON CONFLICT (pedido_id, juego) DO NOTHING;

  SELECT * INTO intento
  FROM public.juego_intentos
  WHERE pedido_id = p_pedido_id AND juego = 'ahorcado';

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
  IF letra !~ '^[A-Z]$' THEN
    RAISE EXCEPTION 'La letra no es válida.';
  END IF;

  SELECT juego.* INTO intento
  FROM public.juego_intentos juego
  JOIN public.pedidos pedido ON pedido.id = juego.pedido_id
  JOIN public.usuarios cliente ON cliente.id = pedido.cliente_id
  WHERE juego.pedido_id = p_pedido_id
    AND juego.juego = 'ahorcado'
    AND pedido.estado = 'confirmado'
    AND cliente.auth_id = auth.uid()
    AND cliente.perfil = 'cliente registrado'
  FOR UPDATE;

  IF intento.id IS NULL OR intento.estado <> 'en_curso' THEN
    RAISE EXCEPTION 'La partida no se puede continuar.';
  END IF;

  SELECT COALESCE(array_agg(valor), ARRAY[]::text[])
  INTO letras
  FROM jsonb_array_elements_text(intento.partida -> 'letras_intentadas') AS valor;
  IF letra = ANY(letras) THEN
    RAISE EXCEPTION 'Esa letra ya fue intentada.';
  END IF;

  palabra := intento.partida ->> 'palabra';
  letras := letras || letra;
  errores := COALESCE((intento.partida ->> 'errores')::integer, 0) + CASE WHEN position(letra IN palabra) = 0 THEN 1 ELSE 0 END;
  gano := NOT EXISTS (
    SELECT 1
    FROM regexp_split_to_table(palabra, '') AS caracteres(letra_palabra)
    WHERE letra_palabra <> ALL(letras)
  );
  perdio := errores >= 6;

  UPDATE public.juego_intentos
  SET partida = jsonb_build_object(
    'palabra', palabra,
    'categoria', intento.partida ->> 'categoria',
    'letras_intentadas', to_jsonb(letras),
    'errores', errores
  )
  WHERE id = intento.id
  RETURNING * INTO intento;

  IF gano THEN
    UPDATE public.pedidos
    SET descuento_porcentaje = 20
    WHERE id = p_pedido_id AND descuento_porcentaje = 0;
    GET DIAGNOSTICS filas = ROW_COUNT;
    aplica_descuento := filas > 0;
  END IF;

  IF gano OR perdio THEN
    UPDATE public.juego_intentos
    SET estado = CASE WHEN gano THEN 'ganado' ELSE 'perdido' END,
        descuento_otorgado = CASE WHEN aplica_descuento THEN 20 ELSE 0 END,
        resolved_at = now()
    WHERE id = intento.id
    RETURNING * INTO intento;
  END IF;

  RETURN public.estado_ahorcado_visible(intento);
END;
$$;

GRANT EXECUTE ON FUNCTION public.iniciar_ahorcado(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intentar_letra_ahorcado(uuid, text) TO authenticated;
