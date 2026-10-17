import type { CartaMemotest } from '../types/juegos';

export const CARTAS_MEMOTEST: CartaMemotest[] = ['taco', 'chile', 'sombrero', 'cupon'];

export function crearMazoMemotest(aleatorio: () => number = Math.random) {
  const mazo = [...CARTAS_MEMOTEST, ...CARTAS_MEMOTEST];
  for (let indice = mazo.length - 1; indice > 0; indice -= 1) {
    const otro = Math.floor(aleatorio() * (indice + 1));
    [mazo[indice], mazo[otro]] = [mazo[otro], mazo[indice]];
  }
  return mazo;
}

export function sonPareja(mazo: CartaMemotest[], primera: number, segunda: number) {
  return primera !== segunda && mazo[primera] === mazo[segunda];
}
