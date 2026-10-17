-- Compatibilidad para bases donde la migración del punto 19 no llegó a aplicarse.
-- liberar_mesa_admin consulta esta columna para detectar una cuenta pendiente.
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS cuenta_solicitada_at timestamptz;
