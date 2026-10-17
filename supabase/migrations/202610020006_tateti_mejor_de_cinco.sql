ALTER TABLE public.juego_intentos
  ALTER COLUMN partida SET DEFAULT '{"tablero":[null,null,null,null,null,null,null,null,null],"turno":"cliente","ronda":1,"puntosCliente":0,"puntosAplicacion":0}'::jsonb;
