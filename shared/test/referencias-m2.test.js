import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BARRIOS_CABA, MUNICIPIOS_PBA, precioReferencia, zonasDe } from '../src/index.js';

test('CABA: los 48 barrios, cada uno en una comuna válida', () => {
  assert.equal(BARRIOS_CABA.length, 48);
  assert.equal(new Set(BARRIOS_CABA.map((b) => b.nombre)).size, 48);
  for (const b of BARRIOS_CABA) assert.ok(b.comuna >= 1 && b.comuna <= 15, b.nombre);
  // Las 15 comunas tienen al menos un barrio
  assert.equal(new Set(BARRIOS_CABA.map((b) => b.comuna)).size, 15);
});

test('CABA: usa la comuna del barrio, los ambientes y usado / a estrenar', () => {
  // Palermo = Comuna 14 (IDECBA 2° trim. 2026)
  assert.equal(precioReferencia({ jurisdiccion: 'caba', zona: 'Palermo', ambientes: 2 }).usdM2, 3118);
  assert.equal(precioReferencia({ jurisdiccion: 'caba', zona: 'Palermo', ambientes: 1, aEstrenar: true }).usdM2, 3885);
  // Recoleta = Comuna 2, 3 ambientes usado
  assert.equal(precioReferencia({ jurisdiccion: 'caba', zona: 'Recoleta', ambientes: 3 }).usdM2, 2616);
});

test('CABA: 4 o más ambientes toma el dato de 3 ambientes', () => {
  const r = precioReferencia({ jurisdiccion: 'caba', zona: 'Caballito', ambientes: 5 });
  assert.equal(r.usdM2, 2181);
  assert.match(r.detalle, /3 amb/);
});

test('CABA: sin dato para la comuna, usa el promedio de la Ciudad', () => {
  // Comuna 8 no publica precio de 1 ambiente usado
  const r = precioReferencia({ jurisdiccion: 'caba', zona: 'Villa Lugano', ambientes: 1 });
  assert.equal(r.usdM2, 2561);
  assert.match(r.detalle, /Promedio Ciudad/);
});

test('Provincia: precio del municipio con su fuente y período', () => {
  const r = precioReferencia({ jurisdiccion: 'provincia', zona: 'Vicente López' });
  assert.equal(r.usdM2, 3045);
  assert.match(r.fuente, /Zonaprop GBA Norte/);
  assert.equal(r.periodo, 'Octubre 2026');
  assert.equal(precioReferencia({ jurisdiccion: 'provincia', zona: 'La Plata' }).usdM2, 1479);
});

test('Provincia: municipios sin repetir y todos con precio', () => {
  assert.equal(new Set(MUNICIPIOS_PBA.map((m) => m.nombre)).size, MUNICIPIOS_PBA.length);
  for (const m of MUNICIPIOS_PBA) assert.ok(m.usdM2 > 0, m.nombre);
});

test('sin ubicación conocida no hay referencia', () => {
  assert.equal(precioReferencia({}), null);
  assert.equal(precioReferencia({ jurisdiccion: 'caba', zona: 'Vicente López' }), null);
  assert.equal(precioReferencia({ jurisdiccion: 'provincia', zona: 'Mar del Plata' }), null);
  assert.deepEqual(zonasDe('otra'), []);
});
