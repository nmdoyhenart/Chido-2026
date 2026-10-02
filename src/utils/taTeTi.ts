import type { MarcaTateti, TableroTateti } from '../types/juegos';

const LINEAS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]] as const;

export function ganadorTateti(tablero: TableroTateti): Exclude<MarcaTateti, null> | null {
  for (const [a, b, c] of LINEAS) {
    if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) return tablero[a];
  }
  return null;
}

export function tableroLleno(tablero: TableroTateti) {
  return tablero.every((casilla) => casilla !== null);
}

function jugadaGanadora(tablero: TableroTateti, marca: Exclude<MarcaTateti, null>) {
  return tablero.findIndex((casilla, indice) => {
    if (casilla !== null) return false;
    const prueba = [...tablero] as TableroTateti;
    prueba[indice] = marca;
    return ganadorTateti(prueba) === marca;
  });
}

export function jugadaAplicacion(tablero: TableroTateti) {
  const ganar = jugadaGanadora(tablero, 'O');
  if (ganar >= 0) return ganar;
  const bloquear = jugadaGanadora(tablero, 'X');
  if (bloquear >= 0) return bloquear;
  if (tablero[4] === null) return 4;
  return tablero.findIndex((casilla) => casilla === null);
}
