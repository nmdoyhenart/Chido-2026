-- Ejecutar manualmente solo en la base de demostracion.
-- Reemplaza los datos operativos de demostracion por un conjunto coherente.
BEGIN;

DELETE FROM public.encuestas_pedidos;
DELETE FROM public.juego_intentos;
DELETE FROM public.pedido_detalles;
DELETE FROM public.pedidos;

-- Deja la lista sin solicitudes y todas las mesas disponibles.
DELETE FROM public.lista_espera;

UPDATE public.mesas
SET disponibilidad = 'vacía',
    cliente_id = NULL,
    qr_confirmado_at = NULL;

DELETE FROM public.usuarios
WHERE correo LIKE 'estadisticas.demo.%@chido.local';

DELETE FROM public.usuarios
WHERE perfil::text = 'cliente registrado'
  AND auth_id IS NULL;

INSERT INTO public.usuarios (
  nombres,
  apellidos,
  correo,
  perfil,
  estado_registro,
  foto_perfil
) VALUES
  ('Sofia', 'Mendez', 'sofia.mendez@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Mateo', 'Herrera', 'mateo.herrera@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Valentina', 'Suarez', 'valentina.suarez@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Tomas', 'Rios', 'tomas.rios@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Camila', 'Paz', 'camila.paz@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Bruno', 'Acosta', 'bruno.acosta@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Julieta', 'Navarro', 'julieta.navarro@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Lautaro', 'Vega', 'lautaro.vega@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Martina', 'Lopez', 'martina.lopez@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Francisco', 'Diaz', 'francisco.diaz@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Agustina', 'Romero', 'agustina.romero@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Nicolas', 'Ferreyra', 'nicolas.ferreyra@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Renata', 'Sosa', 'renata.sosa@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Ignacio', 'Pereyra', 'ignacio.pereyra@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Milagros', 'Castro', 'milagros.castro@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Federico', 'Quiroga', 'federico.quiroga@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Lucia', 'Benitez', 'lucia.benitez@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Santiago', 'Luna', 'santiago.luna@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Clara', 'Molina', 'clara.molina@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png'),
  ('Juan', 'Cabrera', 'juan.cabrera@gmail.com', 'cliente registrado', 'aceptado', 'https://placehold.co/200x200/png')
ON CONFLICT (correo) DO UPDATE
SET nombres = EXCLUDED.nombres,
    apellidos = EXCLUDED.apellidos,
    perfil = EXCLUDED.perfil,
    estado_registro = EXCLUDED.estado_registro,
    foto_perfil = EXCLUDED.foto_perfil;

WITH
  clientes AS (
    SELECT id, row_number() OVER (ORDER BY correo) AS posicion
    FROM public.usuarios
    WHERE perfil::text = 'cliente registrado'
      AND auth_id IS NULL
  ),
  mesas AS (
    SELECT id, row_number() OVER (ORDER BY numero) AS posicion
    FROM public.mesas
  ),
  dias AS (
    SELECT serie AS posicion,
      date_trunc('day', now()) - make_interval(days => ((serie - 1) / 2)::integer)
        + CASE WHEN serie % 2 = 0 THEN interval '20 hours 15 minutes' ELSE interval '13 hours 30 minutes' END AS creado_en
    FROM generate_series(1, 10) AS serie
  ),
  pedidos_demo AS (
    INSERT INTO public.pedidos (
      cliente_id,
      mesa_id,
      estado,
      total,
      solicitud_id,
      created_at
    )
    SELECT
      cliente.id,
      mesa.id,
      'finalizado',
      8500 + ((dia.posicion % 6) * 1750),
      gen_random_uuid(),
      dia.creado_en
    FROM dias AS dia
    JOIN clientes AS cliente ON cliente.posicion = ((dia.posicion - 1) % 20) + 1
    JOIN mesas AS mesa ON mesa.posicion = ((dia.posicion - 1) % 9) + 1
    RETURNING id, cliente_id, created_at
  )
INSERT INTO public.encuestas_pedidos (
  pedido_id,
  cliente_id,
  comida,
  atencion,
  experiencia,
  comentario,
  created_at
)
SELECT
  pedido.id,
  pedido.cliente_id,
  CASE WHEN extract(day FROM pedido.created_at)::integer % 11 = 0 THEN 2 ELSE 3 + (extract(day FROM pedido.created_at)::integer % 3) END,
  CASE WHEN extract(day FROM pedido.created_at)::integer % 13 = 0 THEN 2 ELSE 3 + ((extract(day FROM pedido.created_at)::integer + 1) % 3) END,
  CASE WHEN extract(day FROM pedido.created_at)::integer % 9 = 0 THEN 2 ELSE 3 + ((extract(day FROM pedido.created_at)::integer + 2) % 3) END,
  CASE extract(day FROM pedido.created_at)::integer % 4
    WHEN 0 THEN 'Muy buena atencion y comida.'
    WHEN 1 THEN 'La experiencia fue agradable y volveriamos.'
    WHEN 2 THEN 'La comida llego caliente y a tiempo.'
    ELSE 'Buen servicio en general.'
  END,
  pedido.created_at + interval '90 minutes'
FROM pedidos_demo AS pedido;

COMMIT;
