import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RUTAS_NOTIFICACION } from '../types/notificaciones.ts';
import { crearAvisoClienteRegistrado, obtenerRutaNotificacion } from './notificaciones.ts';

test('crea un aviso de cliente registrado sin datos personales', () => {
  assert.deepEqual(crearAvisoClienteRegistrado(), {
    evento: 'cliente_registrado',
    destinatarios: ['dueño', 'supervisor'],
    titulo: 'Nueva solicitud de registro',
    cuerpo: 'Hay un cliente pendiente de aprobación.',
    datos: { ruta: RUTAS_NOTIFICACION.clientesPendientes },
  });
});

test('acepta únicamente rutas internas declaradas', () => {
  assert.equal(obtenerRutaNotificacion({ ruta: RUTAS_NOTIFICACION.clientesPendientes }), RUTAS_NOTIFICACION.clientesPendientes);
  assert.equal(obtenerRutaNotificacion({ ruta: '/cliente/perfil' }), null);
  assert.equal(obtenerRutaNotificacion({ ruta: 'https://sitio-ajeno.example' }), null);
});

test('rechaza payloads inválidos', () => {
  for (const datos of [null, [], 'texto', 2, { ruta: 2 }, { otraRuta: RUTAS_NOTIFICACION.clientesPendientes }]) {
    assert.equal(obtenerRutaNotificacion(datos), null);
  }
});
