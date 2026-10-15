import type { EstadoJuego, EstadoRondaTateti, MarcaTateti, TableroTateti } from '../types/juegos';

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

export function estadoRondaTateti(tablero: TableroTateti): EstadoRondaTateti {
  const ganador = ganadorTateti(tablero);
  if (ganador === 'X') return 'cliente';
  if (ganador === 'O') return 'aplicacion';
  return tableroLleno(tablero) ? 'empate' : 'en_curso';
}

export function resultadoSerieTateti(ronda: number, puntosCliente: number, puntosAplicacion: number): Exclude<EstadoJuego, 'en_curso'> | null {
  if (puntosCliente >= 3) return 'ganado';
  if (puntosAplicacion >= 3) return 'perdido';
  if (ronda < 5) return null;
  return 'empate';
}

function jugadaGanadora(tablero: TableroTateti, marca: Exclude<MarcaTateti, null>) {
  return tablero.findIndex((casilla, indice) => {
    if (casilla !== null) return false;
    const prueba = [...tablero] as TableroTateti;
    prueba[indice] = marca;
    return ganadorTateti(prueba) === marca;
  });
}

export function jugadaAplicacion(tablero: TableroTateti, aleatorio: () => number = Math.random) {
  const libres = tablero.reduce<number[]>((indices, casilla, indice) => {
    if (casilla === null) indices.push(indice);
    return indices;
  }, []);
  if (libres.length === 0) return -1;

  const ganar = jugadaGanadora(tablero, 'O');
  if (ganar >= 0 && aleatorio() >= 0.35) return ganar;
  const bloquear = jugadaGanadora(tablero, 'X');
  if (bloquear >= 0 && aleatorio() >= 0.55) return bloquear;

  const libresSinBloqueo = bloquear >= 0 ? libres.filter((indice) => indice !== bloquear) : libres;
  const opcionesBase = libresSinBloqueo.length > 0 ? libresSinBloqueo : libres;
  const preferidas = [4, 0, 2, 6, 8].filter((indice) => opcionesBase.includes(indice));
  const opciones = preferidas.length > 0 && aleatorio() >= 0.4 ? preferidas : opcionesBase;
  return opciones[Math.min(opciones.length - 1, Math.floor(aleatorio() * opciones.length))];
}
