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

CREATE TABLE IF NOT EXISTS public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.usuarios(id),
  mesa_id uuid NOT NULL REFERENCES public.mesas(id),
  estado text NOT NULL DEFAULT 'pendiente_mozo',
  total numeric(10, 2) NOT NULL DEFAULT 0,
  propina_porcentaje integer CHECK (
    propina_porcentaje IN (0, 5, 10, 15, 20)
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedido_detalles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric(10, 2) NOT NULL
);