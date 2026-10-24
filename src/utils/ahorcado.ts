import type { PalabraAhorcado } from '../types/juegos';

export const PALABRAS_AHORCADO: PalabraAhorcado[] = [
  { palabra: 'TACO', categoria: 'Comida mexicana' },
  { palabra: 'NACHOS', categoria: 'Comida mexicana' },
  { palabra: 'BURRITO', categoria: 'Comida mexicana' },
  { palabra: 'FAJITAS', categoria: 'Comida mexicana' },
  { palabra: 'QUESADILLA', categoria: 'Comida mexicana' },
  { palabra: 'GUACAMOLE', categoria: 'Comida mexicana' },
  { palabra: 'ENCHILADA', categoria: 'Comida mexicana' },
  { palabra: 'CHILAQUILES', categoria: 'Comida mexicana' },
  { palabra: 'CHIMICHANGA', categoria: 'Comida mexicana' },
  { palabra: 'HUITLACOCHE', categoria: 'Comida mexicana' },
  { palabra: 'ESQUITES', categoria: 'Comida mexicana' },
  { palabra: 'TLACOYOS', categoria: 'Comida mexicana' },
  { palabra: 'MESA', categoria: 'Salón' },
  { palabra: 'MOZO', categoria: 'Salón' },
  { palabra: 'COCINA', categoria: 'Salón' },
  { palabra: 'COMENSALES', categoria: 'Salón' },
  { palabra: 'CUBIERTOS', categoria: 'Salón' },
  { palabra: 'SERVILLETA', categoria: 'Salón' },
  { palabra: 'SOBREMESA', categoria: 'Salón' },
  { palabra: 'PROPINA', categoria: 'Cuenta' },
  { palabra: 'CUENTA', categoria: 'Cuenta' },
  { palabra: 'FACTURA', categoria: 'Cuenta' },
  { palabra: 'DESCUENTO', categoria: 'Cuenta' },
];

export const LETRAS_AHORCADO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

export function normalizarLetraAhorcado(valor: string) {
  const letra = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  return LETRAS_AHORCADO.includes(letra) ? letra : null;
}

export function revelarPalabraAhorcado(palabra: string, letras: string[]) {
  return palabra.split('').map((letra) => letras.includes(letra) ? letra : null);
}

export function ganoAhorcado(palabra: string, letras: string[]) {
  return revelarPalabraAhorcado(palabra, letras).every(Boolean);
}

export function crearPartidaAhorcado(aleatorio: () => number = Math.random) {
  return PALABRAS_AHORCADO[Math.floor(aleatorio() * PALABRAS_AHORCADO.length)];
}
