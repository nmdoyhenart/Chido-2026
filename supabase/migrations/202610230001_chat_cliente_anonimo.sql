-- Permite que los clientes anónimos envíen mensajes en el chat de su mesa
-- haciendo que usuario_id no sea obligatorio.
ALTER TABLE public.chat_mensajes
  ALTER COLUMN usuario_id DROP NOT NULL;

ALTER TABLE public.chat_mensajes
  DROP CONSTRAINT IF EXISTS chat_mensajes_usuario_id_fkey;

ALTER TABLE public.chat_mensajes
  ADD CONSTRAINT chat_mensajes_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;

