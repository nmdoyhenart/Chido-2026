-- La tabla pedidos es responsabilidad del módulo de pedidos. Este bloque sólo
-- agrega la columna de propina si dicha tabla ya fue creada.
ALTER TABLE public.mesas
  ADD COLUMN IF NOT EXISTS cliente_id uuid NULL REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS qr_confirmado_at timestamptz NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mesas_cliente_id_unico
  ON public.mesas (cliente_id)
  WHERE cliente_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lista_espera (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL UNIQUE REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.pedidos
  ADD COLUMN IF NOT EXISTS propina_porcentaje integer NULL;

DO $$
BEGIN
  IF to_regclass('public.pedidos') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'pedidos_propina_porcentaje_valido'
    ) THEN
    ALTER TABLE public.pedidos
      ADD CONSTRAINT pedidos_propina_porcentaje_valido
      CHECK (propina_porcentaje IN (0, 5, 10, 15, 20));
  END IF;
END;
$$;
