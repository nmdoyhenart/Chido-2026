-- La Edge Function invoca esta función mediante PostgREST, que expone public.
-- El acceso queda limitado a service_role; los clientes no pueden tomar la cola.
ALTER FUNCTION private.chido_tomar_notificaciones_push(integer) SET SCHEMA public;
REVOKE ALL ON FUNCTION public.chido_tomar_notificaciones_push(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chido_tomar_notificaciones_push(integer) TO service_role;
