import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearMazoMemotest, sonPareja } from './memotest.ts';

test('crea dos cartas de cada tipo', () => {
  const mazo = crearMazoMemotest(() => 0.5);
  assert.equal(mazo.length, 8);
  for (const carta of ['taco', 'chile', 'sombrero', 'cupon']) assert.equal(mazo.filter((actual) => actual === carta).length, 2);
});

test('distingue pares válidos', () => {
  const mazo = ['taco', 'chile', 'taco', 'chile', 'sombrero', 'cupon', 'sombrero', 'cupon'];
  assert.equal(sonPareja(mazo, 0, 2), true);
  assert.equal(sonPareja(mazo, 0, 1), false);
});
