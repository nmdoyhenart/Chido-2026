CREATE OR REPLACE FUNCTION public.estado_ahorcado_visible(p_intento public.juego_intentos)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  letras text[];
  palabra text;
BEGIN
  palabra := COALESCE(p_intento.partida ->> 'palabra', '');
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
