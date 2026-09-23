const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { FunctionsHttpError } = require('@supabase/supabase-js');

// Compila los módulos puros sin cargar React Native ni enviar peticiones reales.
function cargar(archivo, dependencias = {}, deno) {
  const ruta = path.resolve(__dirname, '..', archivo);
  const codigo = ts.transpileModule(fs.readFileSync(ruta, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulo = { exports: {} };
  const importar = nombre => dependencias[nombre] ?? (nombre.startsWith('.')
    ? cargar(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(ruta), nombre.endsWith('.ts') ? nombre : nombre + '.ts')), dependencias, deno)
    : require(nombre));
  new Function('require', 'module', 'exports', 'Deno', codigo)(importar, modulo, modulo.exports, deno);
  return modulo.exports;
}
const { crearServicioEmpleados } = cargar('src/services/empleados.api.ts');
const datos = { nombres: 'Ana', apellidos: 'Perez', dni: '30123456', cuil: '27301234560', correo: 'ana@example.com', password: 'Empleado123', perfil: 'mozo', fotoBase64: '/9j/' + 'AAAA'.repeat(50) };
const session = { data: { session: { access_token: 'sesion-de-prueba' } }, error: null };
function servicio(invoke, getSession = async () => session, limites) {
  return crearServicioEmpleados({ auth: { getSession }, functions: { invoke } }, limites);
}

test('valida antes de acceder a la sesión o al servidor', async () => {
  const resultado = await servicio(() => assert.fail(), () => assert.fail())({ ...datos, correo: 'invalido' });
  assert.equal(resultado.ok, false);
  assert.ok(resultado.campos.correo);
});
test('envía la sesión del responsable y confirma sólo un perfil aceptado', async () => {
  const crear = servicio(async (nombre, opciones) => {
    assert.equal(nombre, 'registrar-empleado');
    assert.equal(opciones.headers.Authorization, 'Bearer sesion-de-prueba');
    assert.equal(opciones.body.perfil, 'mozo');
    return { data: { ok: true, estado: 'aceptado' }, error: null };
  });
  assert.deepEqual(await crear(datos), { ok: true });
  const ambiguo = await servicio(async () => ({ data: { ok: true }, error: null }))(datos);
  assert.equal(ambiguo.ok, false);
});
test('no envía un registro sin sesión', async () => {
  const resultado = await servicio(() => assert.fail(), async () => ({ data: { session: null }, error: null }))(datos);
  assert.match(resultado.mensaje, /Iniciá sesión/);
});
test('una sesión bloqueada termina sin enviar un alta tardía', async () => {
  let resolver;
  const pendiente = new Promise(resolve => { resolver = resolve; });
  const resultado = await servicio(() => assert.fail(), () => pendiente, { sesion: 5, envio: 20 })(datos);
  assert.match(resultado.mensaje, /recuperar tu sesión/);
  resolver(session);
  await new Promise(resolve => setTimeout(resolve, 10));
});
test('un envío bloqueado libera la espera y advierte del resultado incierto', async () => {
  let signal;
  const resultado = await servicio(async (_, opciones) => {
    signal = opciones.signal;
    return new Promise(() => {});
  }, undefined, { sesion: 20, envio: 5 })(datos);
  assert.match(resultado.mensaje, /demoró demasiado/);
  assert.equal(signal.aborted, true);
});
test('distingue errores del gateway y conserva los errores de campos', async () => {
  for (const [status, esperado] of [[401, /JWT/], [403, /permiso/], [404, /no está publicada/], [413, /foto/]]) {
    const resultado = await servicio(async () => ({ data: null, error: new FunctionsHttpError(Response.json({ message: 'gateway' }, { status })) }))(datos);
    assert.match(resultado.mensaje, esperado);
  }
  const resultado = await servicio(async () => ({ data: null, error: new FunctionsHttpError(Response.json({ mensaje: 'Correo duplicado.', campos: { correo: 'Ya existe.', secreto: 'no mostrar' } }, { status: 409 })) }))(datos);
  assert.deepEqual(resultado.campos, { correo: 'Ya existe.' });
});
test('servidor permite validar altas de dueño y supervisor aceptados; rechaza otros perfiles', async () => {
  for (const [perfil, estado_registro, esperado] of [['dueño', 'aceptado', 400], ['supervisor', 'aceptado', 400], ['mozo', 'aceptado', 403], ['supervisor', 'pendiente', 403]]) {
    let handler;
    const consulta = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { perfil, estado_registro }, error: null }; } };
    cargar('supabase/functions/registrar-empleado/index.ts', {
      'npm:@supabase/supabase-js@2.112.4': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'responsable' } }, error: null }) }, from: () => consulta }) },
    }, { env: { get: () => 'prueba' }, serve: fn => { handler = fn; } });
    // El cuerpo vacío produce VALIDACION sólo después de superar el control de permisos.
    const respuesta = await handler(new Request('https://prueba.invalid', { method: 'POST', headers: { Authorization: 'Bearer prueba', 'Content-Type': 'application/json' }, body: '{}' }));
    assert.equal(respuesta.status, esperado, perfil + '/' + estado_registro);
    if (esperado === 400) assert.equal((await respuesta.json()).codigo, 'VALIDACION');
    const sinSesion = await handler(new Request('https://prueba.invalid', { method: 'POST', body: '{}' }));
    assert.equal(sinSesion.status, 401);
  }
});
