import assert from 'node:assert/strict';
import test from 'node:test';
import { crearPartidaAhorcado, ganoAhorcado, normalizarLetraAhorcado, revelarPalabraAhorcado } from './ahorcado.ts';

test('normaliza letras con tilde', () => {
  assert.equal(normalizarLetraAhorcado('é'), 'E');
  assert.equal(normalizarLetraAhorcado('ab'), null);
});

test('revela sólo las letras intentadas', () => {
  assert.deepEqual(revelarPalabraAhorcado('TACO', ['A', 'T']), ['T', 'A', null, null]);
  assert.equal(ganoAhorcado('TACO', ['T', 'A', 'C', 'O']), true);
});

test('elige una palabra válida para el modo recreativo', () => {
  assert.deepEqual(crearPartidaAhorcado(() => 0), { palabra: 'TACO', categoria: 'Comida mexicana' });
});

test('conserva la solución aunque no haya letras acertadas', () => {
  const partida = { palabra: 'TACO', categoria: 'Comida mexicana' };
  assert.deepEqual(revelarPalabraAhorcado(partida.palabra, []), [null, null, null, null]);
  assert.equal(partida.palabra, 'TACO');
});
