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

test('resuelve rutas de chat para cliente y mozo correctamente', () => {
  // Chat cliente
  assert.equal(obtenerRutaNotificacion({ ruta: '/cliente/chat' }), '/cliente/chat');
  assert.equal(obtenerRutaNotificacion({ evento: 'chat_cliente' }), '/cliente/chat');

  // Chat mozo con query string incorporado
  assert.equal(
    obtenerRutaNotificacion({ ruta: '/mozo/chat-mesa?mesaId=mesa-uuid-1&numero=4' }),
    '/mozo/chat-mesa?mesaId=mesa-uuid-1&numero=4'
  );

  // Chat mozo con propiedades separadas
  assert.equal(
    obtenerRutaNotificacion({ ruta: '/mozo/chat-mesa', mesaId: 'mesa-uuid-1', numero: '4' }),
    '/mozo/chat-mesa?mesaId=mesa-uuid-1&numero=4'
  );

  // Chat mozo por evento
  assert.equal(
    obtenerRutaNotificacion({ evento: 'chat_mozo', mesaId: 'mesa-uuid-1', numero: 2 }),
    '/mozo/chat-mesa?mesaId=mesa-uuid-1&numero=2'
  );

  // Chat mozo solo con mesaId
  assert.equal(
    obtenerRutaNotificacion({ ruta: '/mozo/chat-mesa', mesaId: 'mesa-uuid-1' }),
    '/mozo/chat-mesa?mesaId=mesa-uuid-1'
  );

  // Chat mozo sin params
  assert.equal(
    obtenerRutaNotificacion({ ruta: '/mozo/chat-mesa' }),
    '/mozo/chat-mesa'
  );
});
