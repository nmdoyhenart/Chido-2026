-- La cola del servidor es la única fuente de avisos de pedidos nuevos.
DROP TRIGGER IF EXISTS trg_pedidos_notificar ON public.pedidos;

CREATE TRIGGER trg_pedidos_notificar
AFTER INSERT OR UPDATE OF estado ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.notificar_nuevo_pedido();
