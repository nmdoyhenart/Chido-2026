const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

// Ejecuta los handlers reales con interfaces nativas y servicios aislados.
function escenario(archivo, mode = 'simulation', role = 'dueño') {
  const estados = [], efectos = [], bloqueos = [], navegaciones = [];
  let cursor = 0, llamadasRemotas = 0;
  const hooks = { ...React,
    useState: initial => { const i = cursor++; if (!(i in estados)) estados[i] = typeof initial === 'function' ? initial() : initial; return [estados[i], v => { estados[i] = typeof v === 'function' ? v(estados[i]) : v; }]; },
    useRef: value => ({ current: value }), useEffect: () => {}, useEffectEvent: f => f,
    useCallback: f => f, useMemo: f => f(),
  };
  const router = { push: r => navegaciones.push(r), replace: r => navegaciones.push(r) };
  const native = new Proxy({ StyleSheet: { create: s => s }, Platform: { OS: 'android' },
    AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    useWindowDimensions: () => ({ width: 393, height: 850, fontScale: 1 }),
    Vibration: { vibrate() {} }, Alert: { alert() {} },
  }, { get: (o, k) => o[k] ?? k });
  const remoto = () => { llamadasRemotas++; throw Error('Acceso remoto inesperado'); };
  function cargar(file) {
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const mod = { exports: {} };
    const req = name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'react-native') return native;
      if (name === 'expo-router') return { router, useRouter: () => router, Stack: { Screen: 'Screen' }, Redirect: 'Redirect', useNavigation: () => ({ isFocused: () => true }), useFocusEffect: f => efectos.push(f) };
      if (name === 'expo-camera') return { useCameraPermissions: () => [{ granted: true }, () => {}], CameraView: 'CameraView' };
      if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ left: 0, right: 0 }) };
      if (name.includes('AppSessionContext')) return { useAppSession: () => ({ mode, role, cargando: false }) };
      if (name.includes('RestriccionSimulacion')) return { useRestriccionSimulacion: () => ({ modal: null, bloquear: accion => { if (mode !== 'simulation') return false; bloqueos.push(accion); return true; } }) };
      if (name.includes('/services/')) return new Proxy({}, { get: () => remoto });
      if (name.endsWith('/demostracion') || name.endsWith('/colores') || name.endsWith('/mesa') || name.endsWith('/useMesas')) return cargar(path.resolve(path.dirname(file), name + '.ts'));
      if (name.endsWith('/permisos')) return { puedeAdministrarMesas: () => true };
      if (name.endsWith('.png') || name.endsWith('.jpeg')) return 1;
      return new Proxy({ __esModule: true, default: 'Component' }, { get: (o, k) => o[k] ?? k });
    };
    new Function('require', 'module', 'exports', output)(req, mod, mod.exports);
    return mod.exports;
  }
  const exports = cargar(path.resolve(archivo));
  const Component = exports.default ?? exports.useRestriccionSimulacion;
  return { render: () => { cursor = 0; return Component(); }, efectos, bloqueos, navegaciones, remotas: () => llamadasRemotas };
}
function buscar(nodo, predicado) {
  if (!nodo || typeof nodo !== 'object') return;
  if (Array.isArray(nodo)) { for (const n of nodo) { const r = buscar(n, predicado); if (r) return r; } return; }
  if (predicado(nodo)) return nodo;
  return buscar(nodo.props?.children, predicado);
}

test('alta de empleado bloquea guardar antes de validar o subir archivos', async () => {
  const e = escenario('src/app/supervisor/agregar-empleado.tsx');
  await buscar(e.render(), n => n.props?.title === 'Guardar Empleado').props.onPress();
  assert.deepEqual(e.bloqueos, ['guardar empleados']); assert.equal(e.remotas(), 0);
});
test('alta de mesa bloquea guardar sin escribir ni pedir una foto', async () => {
  const e = escenario('src/app/mesas/alta.tsx');
  const boton = buscar(e.render(), n => n.props?.onPress && buscar(n.props.children, c => c.props?.children === 'Guardar mesa'));
  await boton.props.onPress();
  assert.deepEqual(e.bloqueos, ['guardar mesas']); assert.equal(e.remotas(), 0);
});
test('gestión de mesas bloquea disponibilidad y QR de demostración', async () => {
  const e = escenario('src/app/mesas/gestion.tsx');
  const lista = buscar(e.render(), n => n.props?.onCambiarDisponibilidad);
  await lista.props.onCambiarDisponibilidad(lista.props.mesas[0]);
  lista.props.onVerQr(lista.props.mesas[0]);
  assert.equal(e.bloqueos.length, 2); assert.equal(e.remotas(), 0);
});
test('solicitudes muestra ejemplos y bloquea aceptar y rechazar sin servicios remotos', async () => {
  const e = escenario('src/components/dueno/SolicitudesClientes.tsx');
  e.render();
  const limpiar = e.efectos[0]();
  try {
    buscar(e.render(), n => n.props?.onLayout).props.onLayout({ nativeEvent: { layout: { height: 640 } } });
    const lista = buscar(e.render(), n => n.props?.renderItem);
    assert.equal(lista.props.data.length, 3);
    const card = buscar(lista.props.renderItem({ item: 0 }), n => n.props?.onAceptar);
    card.props.onAceptar(); card.props.onRechazar();
    assert.deepEqual(e.bloqueos, ['aceptar clientes', 'rechazar clientes']);
    assert.equal(e.remotas(), 0);
  } finally { limpiar(); }
});


test('el modal de simulación se abre con la acción y permite cerrarse', () => {
  const e = escenario('src/components/ui/RestriccionSimulacion.tsx');
  assert.equal(e.render().bloquear('aceptar clientes'), true);
  const modal = e.render().modal;
  assert.equal(modal.props.visible, true);
  assert.ok(buscar(modal, n => Array.isArray(n.props?.children) && n.props.children.includes('aceptar clientes')));
  modal.props.onRequestClose();
  assert.equal(e.render().modal.props.visible, false);
});
test('la restricción de simulación no bloquea una sesión autenticada', () => {
  const e = escenario('src/components/ui/RestriccionSimulacion.tsx', 'authenticated');
  assert.equal(e.render().bloquear('aceptar clientes'), false);
  assert.equal(e.render().modal.props.visible, false);
});

test('supervisor usa el mismo panel funcional que dueño con identidad de demostración', () => {
  const dueno = escenario('src/app/(app)/home.tsx').render();
  const supervisor = escenario('src/app/(app)/home.tsx', 'simulation', 'supervisor').render();
  assert.equal(supervisor.type, dueno.type);
  assert.equal(supervisor.props.simulacion, true);
  assert.equal(supervisor.props.usuario.nombres, 'Supervisor de demostración');
  assert.equal(supervisor.props.usuario.perfil, 'supervisor');
});

test('supervisor puede revisar solicitudes pero no aceptar ni rechazar', () => {
  const e = escenario('src/components/dueno/SolicitudesClientes.tsx', 'simulation', 'supervisor');
  e.render();
  const limpiar = e.efectos[0]();
  try {
    buscar(e.render(), n => n.props?.onLayout).props.onLayout({ nativeEvent: { layout: { height: 640 } } });
    const lista = buscar(e.render(), n => n.props?.renderItem);
    assert.equal(lista.props.data.length, 3);
    const card = buscar(lista.props.renderItem({ item: 0 }), n => n.props?.onAceptar);
    card.props.onAceptar();
    card.props.onRechazar();
    assert.deepEqual(e.bloqueos, ['aceptar clientes', 'rechazar clientes']);
    assert.equal(e.remotas(), 0);
  } finally { limpiar(); }
});
