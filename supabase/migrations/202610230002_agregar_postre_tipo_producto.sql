-- Permite registrar postres como productos de primera clase.
-- Detecta el enum usado por public.productos.tipo para no depender de su nombre.
DO $$
DECLARE
  v_tipo_enum regtype;
BEGIN
  SELECT a.atttypid::regtype
  INTO v_tipo_enum
  FROM pg_attribute AS a
  JOIN pg_class AS c ON c.oid = a.attrelid
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_type AS t ON t.oid = a.atttypid
  WHERE n.nspname = 'public'
    AND c.relname = 'productos'
    AND a.attname = 'tipo'
    AND NOT a.attisdropped
    AND t.typtype = 'e';

  IF v_tipo_enum IS NULL THEN
    RAISE EXCEPTION 'public.productos.tipo no usa un enum; revisar el esquema antes de aplicar esta migracion.';
  END IF;

  EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', v_tipo_enum, 'postre');
END;
$$;
