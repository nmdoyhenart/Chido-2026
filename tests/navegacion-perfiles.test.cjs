const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const raiz = path.resolve(__dirname, '..');
// Ejecuta los componentes de entrada con sesión y navegación controladas.
// No levanta React Native ni hace solicitudes a Supabase.
function cargar(archivo, dependencias) {
  const codigo = ts.transpileModule(fs.readFileSync(path.join(raiz, archivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(nombre => {
    if (Object.hasOwn(dependencias, nombre)) {
      const dependencia = dependencias[nombre];
      return Object.hasOwn(dependencia, 'default') ? { __esModule: true, ...dependencia } : dependencia;
    }
    if (/\.(png|jpeg)$/.test(nombre)) return nombre;
    throw new Error(`Dependencia sin simular: ${nombre}`);
  }, modulo, modulo.exports);
  return modulo.exports;
}
const destinos = cargar('src/utils/inicioPorPerfil.ts', {});
const perfiles = ['dueño', 'supervisor', 'mozo', 'metre', 'cocinero', 'cantinero', 'cliente registrado', 'cliente anónimo'];
function entorno(inicial) {
  let sesion = inicial;
  const acciones = [];
  const setters = [];
  const router = {
    replace: href => acciones.push(['replace', href]),
    dismissTo: href => acciones.push(['dismissTo', href]),
  };
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
  const deps = {
    react: { useState: inicial => [inicial, valor => setters.push(valor)], useRef: current => ({ current }), useEffect: fn => fn() },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': Object.assign(Object.fromEntries(['Modal', 'ScrollView', 'View', 'Text', 'Pressable', 'TouchableOpacity', 'TextInput', 'Image', 'ImageBackground', 'KeyboardAvoidingView'].map(n => [n, n])), {
      Vibration: { vibrate() {} }, StyleSheet: { create: value => value }, Platform: { OS: 'ios' },
    }),
    'expo-router': { useRouter: () => router, router, Redirect: 'Redirect', Stack: { Screen: 'Screen' } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons', MaterialCommunityIcons: 'MaterialCommunityIcons' },
    '../../contexts/AppSessionContext': { useAppSession: () => sesion },
    '../../theme/colores': { colores: {} },
    '../../utils/inicioPorPerfil': destinos,
    '../ui/ChidoLoader': { default: 'Loader' },
    '../../components/ui/ChidoLoader': { default: 'Loader' },
    '../../components/dueno/InicioDueno': { default: 'InicioDueno' },
    '../../components/mozo/InicioMozo': { default: 'InicioMozo' },
    '../../services/auth.service': { ErrorAcceso: Error },
    '../../../shared/registro-cliente': { validarCorreo: () => true },
    './AccesoRapidoModal': { default: 'AccesoRapidoModal' },
    '../../components/auth/FormularioRegistroCliente': { default: 'Formulario' },
    '../../components/ui/RestriccionSimulacion': { useRestriccionSimulacion: () => ({ bloquear: () => sesion.mode === 'simulation', modal: null }) },
    '../../services/registro-cliente.service': { registrarCliente: async (...args) => { acciones.push(['registrar', ...args]); return { ok: true }; } },
  };
  return {
    acciones, setters, deps,
    cambiar: siguiente => { sesion = siguiente; },
    render: (archivo, props) => cargar(archivo, deps).default(props),
  };
}
function buscar(nodo, condicion) {
  if (!nodo || typeof nodo !== 'object') return undefined;
  if (condicion(nodo)) return nodo;
  for (const hijo of [nodo.props?.children].flat(Infinity)) {
    const resultado = buscar(hijo, condicion);
    if (resultado) return resultado;
  }
}
function verificarPantalla(nodo) {
  if (nodo.type !== 'Redirect') {
    assert.ok(['InicioDueno', 'InicioMozo'].includes(nodo.type));
    return nodo.type;
  }
  assert.notEqual(nodo.props.href, '/(auth)/login');
  const ruta = path.join(raiz, 'src/app', nodo.props.href + '.tsx');
  assert.ok(fs.existsSync(ruta), `Falta la pantalla ${nodo.props.href}`);
  assert.match(fs.readFileSync(ruta, 'utf8'), /export default/);
  return nodo.props.href;
}

for (const role of perfiles) {
  test(`${role}: login y acceso rápido llegan a la misma pantalla existente`, async () => {
    const real = entorno({ mode: 'authenticated', role, cargando: false, usuario: { id: 'prueba', perfil: role, nombres: 'Ana' } });
    real.render('src/components/auth/Login.tsx');
    assert.deepEqual(real.acciones, [['replace', destinos.ENTRADA_APP]]);
    const pantallaReal = verificarPantalla(real.render('src/app/(app)/home.tsx'));

    const rapido = entorno({ mode: 'guest', role: null, enterSimulation: async seleccionado => {
      assert.equal(seleccionado, role);
      rapido.cambiar({ mode: 'simulation', role: seleccionado, usuario: null, cargando: false });
    } });
    let cerrado = false;
    const modal = rapido.render('src/components/auth/AccesoRapidoModal.tsx', { visible: true, onClose: () => { cerrado = true; } });
    await buscar(modal, nodo => nodo.key === role).props.onPress();
    assert.equal(cerrado, true);
    assert.deepEqual(rapido.acciones, [['replace', destinos.ENTRADA_APP]]);
    assert.equal(verificarPantalla(rapido.render('src/app/(app)/home.tsx')), pantallaReal);
  });
}

test('espera la verificación y rechaza perfiles o sesiones sin acceso', () => {
  const app = entorno({ mode: 'authenticated', role: 'dueño', usuario: null, cargando: true });
  assert.equal(app.render('src/app/(app)/home.tsx').type, 'Loader');
  for (const sesion of [
    { mode: 'authenticated', role: 'dueño', usuario: null },
    { mode: 'guest', role: 'dueño' },
    { mode: 'simulation', role: 'desconocido' },
    { mode: 'simulation', role: 'toString' },
    { mode: 'guest', role: null },
  ]) {
    app.cambiar(sesion);
    assert.equal(app.render('src/app/(app)/home.tsx').props.href, '/(auth)/login');
  }
  app.cambiar({ mode: 'guest', role: 'cliente anónimo' });
  assert.equal(verificarPantalla(app.render('src/app/(app)/home.tsx')), '/cliente-anonimo/escanear');
  app.cambiar({ mode: 'simulation', role: 'cocina' });
  assert.equal(verificarPantalla(app.render('src/app/(app)/home.tsx')), '/productos/alta');
});

test('si falla el inicio rápido no cierra el selector ni navega', async () => {
  const app = entorno({ enterSimulation: async () => { throw new Error('Sin conexión'); } });
  const modal = app.render('src/components/auth/AccesoRapidoModal.tsx', { visible: true, onClose: () => assert.fail('No debe cerrar') });
  await buscar(modal, nodo => nodo.key === 'metre').props.onPress();
  assert.deepEqual(app.acciones, []);
  assert.ok(app.setters.some(valor => typeof valor === 'string' && valor.includes('No se pudo iniciar')));
});

test('el metre vuelve a su inicio desde el registro y la simulación no envía altas', async () => {
  for (const mode of ['authenticated', 'simulation']) {
    const app = entorno({ mode, role: 'metre', cargando: false });
    const form = buscar(app.render('src/app/(auth)/registro.tsx'), nodo => nodo.type === 'Formulario');
    assert.equal(form.props.esMetre, true);
    form.props.onVolver();
    assert.deepEqual(app.acciones.shift(), ['dismissTo', '/metre/home']);
    const resultado = await form.props.onSubmit({ nombres: 'Ana' });
    assert.equal(resultado.ok, mode === 'authenticated');
    assert.equal(app.acciones.length, mode === 'authenticated' ? 1 : 0);
  }
});

test('salir del cliente anónimo cierra la sesión antes de volver al login', async () => {
  const app = entorno({ cerrarSesion: async () => app.acciones.push(['logout']) });
  app.deps['@react-native-async-storage/async-storage'] = { removeItem: async clave => app.acciones.push(['removeItem', clave]) };
  const pantalla = app.render('src/app/cliente-anonimo/espera.tsx');
  await buscar(pantalla, nodo => nodo.type === 'TouchableOpacity' && nodo.props.disabled === false).props.onPress();
  assert.deepEqual(app.acciones, [['logout'], ['removeItem', 'cliente_anonimo_id'], ['replace', '/(auth)/login']]);
});
