-- Corrige funciones ya desplegadas: SELECT INTO asigna NULL cuando la consulta
-- de idempotencia no encuentra un pedido; el acumulador se reinicia antes del cálculo.
DO $$
DECLARE
  v_funcion regprocedure;
  v_definicion text;
  v_anterior text;
  v_nueva text;
BEGIN
  v_funcion := to_regprocedure('public.guardar_pedido_cliente(uuid,uuid,jsonb,uuid)');
  IF v_funcion IS NOT NULL THEN
    v_definicion := pg_get_functiondef(v_funcion);
    v_anterior := $old$
  IF v_pedido_id IS NOT NULL THEN
    RETURN jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total);
  END IF;

  IF p_pedido_id IS NULL THEN$old$;
    v_nueva := $new$
  IF v_pedido_id IS NOT NULL THEN
    RETURN jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total);
  END IF;
  v_total := 0;

  IF p_pedido_id IS NULL THEN$new$;
    IF position(v_nueva IN v_definicion) = 0 THEN
      IF position(v_anterior IN v_definicion) = 0 THEN
        RAISE EXCEPTION 'No se pudo aplicar la corrección del acumulador en guardar_pedido_cliente.';
      END IF;
      EXECUTE replace(v_definicion, v_anterior, v_nueva);
    END IF;
  END IF;

  v_funcion := to_regprocedure('public.guardar_pedido_cliente_anonimo(uuid,uuid,uuid,jsonb,uuid)');
  IF v_funcion IS NOT NULL THEN
    v_definicion := pg_get_functiondef(v_funcion);
    v_anterior := $old$
  IF v_pedido_id IS NOT NULL THEN RETURN jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total); END IF;

  IF p_pedido_id IS NOT NULL THEN$old$;
    v_nueva := $new$
  IF v_pedido_id IS NOT NULL THEN RETURN jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total); END IF;
  v_total := 0;

  IF p_pedido_id IS NOT NULL THEN$new$;
    IF position(v_nueva IN v_definicion) = 0 THEN
      IF position(v_anterior IN v_definicion) = 0 THEN
        RAISE EXCEPTION 'No se pudo aplicar la corrección del acumulador en guardar_pedido_cliente_anonimo.';
      END IF;
      EXECUTE replace(v_definicion, v_anterior, v_nueva);
    END IF;
  END IF;
END $$;
