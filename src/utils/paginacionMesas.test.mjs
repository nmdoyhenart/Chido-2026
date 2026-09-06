import assert from "node:assert/strict";
import { test } from "node:test";
import { agruparTarjetasPorAltura } from "./paginacionMesas.ts";

test("agrupa cuatro tarjetas completas cuando caben", () => {
  assert.deepEqual(agruparTarjetasPorAltura([140, 140, 140, 140, 140], 600), [[0, 1, 2, 3], [4]]);
});

test("incluye separaciones y no deja una tarjeta parcialmente visible", () => {
  assert.deepEqual(agruparTarjetasPorAltura([140, 140, 140], 291), [[0], [1], [2]]);
  assert.deepEqual(agruparTarjetasPorAltura([140, 140, 140], 292), [[0, 1], [2]]);
});

test("respeta alturas distintas y texto ampliado sin comprimir", () => {
  assert.deepEqual(agruparTarjetasPorAltura([130, 220, 160, 150], 370), [[0, 1], [2, 3]]);
});

test("una tarjeta mayor que la pantalla queda sola para permitir lectura desplazable", () => {
  assert.deepEqual(agruparTarjetasPorAltura([600, 120, 120], 300), [[0], [1, 2]]);
});

test("lista vacía y pantalla todavía sin medir", () => {
  assert.deepEqual(agruparTarjetasPorAltura([], 300), []);
  assert.deepEqual(agruparTarjetasPorAltura([100], 0), []);
});

test("nunca pierde, repite o desborda tarjetas que caben individualmente", () => {
  const alturas = [105, 202, 167, 308, 125, 141, 160, 450, 130];
  for (const disponible of [240, 320, 480, 720]) {
    const paginas = agruparTarjetasPorAltura(alturas, disponible);
    assert.deepEqual(paginas.flat(), alturas.map((_, indice) => indice));
    for (const pagina of paginas) {
      const usada = pagina.reduce((total, indice) => total + alturas[indice], 0) + (pagina.length - 1) * 12;
      assert.ok(usada <= disponible || (pagina.length === 1 && alturas[pagina[0]] > disponible));
    }
  }
});
