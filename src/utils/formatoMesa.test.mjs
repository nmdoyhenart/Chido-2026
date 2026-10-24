import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatearTipoMesa, formatearRolMesa } from './formatoMesa.ts';

test('formatea tipo de mesa correctamente', () => {
  assert.equal(formatearTipoMesa('VIP'), 'VIP');
  assert.equal(formatearTipoMesa('vip'), 'VIP');
  assert.equal(formatearTipoMesa('estándar'), 'Estándar');
  assert.equal(formatearTipoMesa('estandar'), 'Estándar');
  assert.equal(formatearTipoMesa('movilidad reducida'), 'PRM');
  assert.equal(formatearTipoMesa('prm'), 'PRM');
  assert.equal(formatearTipoMesa('PRM'), 'PRM');
  assert.equal(formatearTipoMesa(null), '');
  assert.equal(formatearTipoMesa(undefined), '');
});

test('formatea rol de mesa con numero y tipo', () => {
  assert.equal(formatearRolMesa(2, 'VIP'), 'Mesa 2 - VIP');
  assert.equal(formatearRolMesa(1, 'estándar'), 'Mesa 1 - Estándar');
  assert.equal(formatearRolMesa(3, 'movilidad reducida'), 'Mesa 3 - PRM');
  assert.equal(formatearRolMesa(4, null), 'Mesa 4');
  assert.equal(formatearRolMesa(null, null, 'Tu Pedido'), 'Tu Pedido');
  assert.equal(formatearRolMesa(undefined, undefined, 'Mesa'), 'Mesa');
});

