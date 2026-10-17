-- La pantalla de seguimiento consulta este RPC con la sesión del cliente.
-- Se restablece el permiso aunque otro despliegue haya revocado los permisos por defecto.
GRANT EXECUTE ON FUNCTION public.obtener_estado_pedido_cliente(uuid) TO authenticated;
