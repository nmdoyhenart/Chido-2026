-- ATENCIÓN: este rollback elimina pedidos, detalles y lista de espera creados
-- por 20260904_qr_mesas.sql. No ejecutarlo si esas tablas ya contienen datos
-- que se quieran conservar.

DROP TABLE IF EXISTS public.pedido_detalles;
DROP TABLE IF EXISTS public.pedidos;
DROP TABLE IF EXISTS public.lista_espera;

DROP INDEX IF EXISTS public.mesas_cliente_id_unico;

ALTER TABLE public.mesas
  DROP COLUMN IF EXISTS qr_confirmado_at,
  DROP COLUMN IF EXISTS cliente_id;
