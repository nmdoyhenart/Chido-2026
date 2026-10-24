import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estadoRondaTateti, jugadaAplicacion, resultadoSerieTateti } from './taTeTi.ts';

test('la serie termina al alcanzar tres victorias', () => {
  assert.equal(resultadoSerieTateti(3, 3, 0), 'ganado');
  assert.equal(resultadoSerieTateti(4, 3, 1), 'ganado');
  assert.equal(resultadoSerieTateti(5, 3, 2), 'ganado');
  assert.equal(resultadoSerieTateti(3, 0, 3), 'perdido');
});

test('la serie sigue en curso antes de cinco rondas sin tres victorias', () => {
  assert.equal(resultadoSerieTateti(4, 2, 1), null);
  assert.equal(resultadoSerieTateti(4, 1, 2), null);
});

test('la quinta ronda sin tres victorias termina sin descuento', () => {
  assert.equal(resultadoSerieTateti(5, 2, 1), 'empate');
  assert.equal(resultadoSerieTateti(5, 1, 2), 'empate');
  assert.equal(resultadoSerieTateti(5, 2, 2), 'empate');
});

test('el tablero determina si una ronda sigue en curso o terminó', () => {
  assert.equal(estadoRondaTateti(['X', 'X', 'X', null, null, null, null, null, null]), 'cliente');
  assert.equal(estadoRondaTateti(['O', 'O', 'O', null, null, null, null, null, null]), 'aplicacion');
  assert.equal(estadoRondaTateti(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']), 'empate');
  assert.equal(estadoRondaTateti(['X', null, null, null, null, null, null, null, null]), 'en_curso');
});

test('la IA amigable bloquea a veces y también comete errores', () => {
  const tablero = ['X', 'X', null, 'O', null, null, null, null, null];
  assert.equal(jugadaAplicacion(tablero, () => 0.9), 2);
  assert.equal(jugadaAplicacion(tablero, () => 0), 4);
});

test('la IA amigable siempre elige una casilla libre', () => {
  const tablero = ['X', 'O', null, null, null, null, null, null, null];
  assert.equal(jugadaAplicacion(tablero, () => 0.1), 2);
  assert.equal(jugadaAplicacion(tablero, () => 0.8), 8);
});
