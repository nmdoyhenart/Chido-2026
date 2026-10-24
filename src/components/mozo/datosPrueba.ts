export const pedidosPrueba = [
  { mesa: 3, minutos: 2, items: [{ nombre: 'Taco al pastor', cantidad: 3 }, { nombre: 'Michelada', cantidad: 2 }] },
  { mesa: 5, minutos: 5, items: [{ nombre: 'Burrito de asada', cantidad: 2 }, { nombre: 'Limonada', cantidad: 2 }] },
  { mesa: 8, minutos: 8, items: [{ nombre: 'Taco de birria', cantidad: 4 }, { nombre: 'Agua fresca', cantidad: 2 }] },
];
export const consultasPrueba = [
  { mesa: 5, hora: '19:42', nueva: true, mensajes: [
    { texto: '¿Nos traen más tortillas, por favor?', hora: '19:40', propio: false },
    { texto: 'También una jarra de agua si pueden', hora: '19:41', propio: false },
    { texto: 'Claro, ya se las llevo', hora: '19:42', propio: true },
  ] },
  { mesa: 2, hora: '19:35', nueva: true, mensajes: [
    { texto: 'Consulta: ¿tienen opciones vegetarianas?', hora: '19:35', propio: false },
  ] },
  { mesa: 8, hora: '19:10', nueva: false, mensajes: [
    { texto: 'Gracias, ya estamos listos para pedir.', hora: '19:10', propio: false },
  ] },
];
export const cartaPrueba = [
  { categoria: 'Tacos', productos: [
    { nombre: 'Taco al pastor', descripcion: 'Cerdo marinado, piña, cebolla y cilantro', precio: 45 },
    { nombre: 'Taco de birria', descripcion: 'Res deshebrada con consomé para mojar', precio: 52 },
    { nombre: 'Taco de camarón', descripcion: 'Camarón a la plancha, chipotle y col', precio: 58 },
  ] },
  { categoria: 'Burritos', productos: [
    { nombre: 'Burrito de asada', descripcion: 'Res asada, frijoles, arroz y guacamole', precio: 95 },
    { nombre: 'Burrito vegetariano', descripcion: 'Frijoles, elote, pimientos y queso', precio: 85 },
  ] },
];
