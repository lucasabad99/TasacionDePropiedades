import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularTasacion, validarDatos } from '../src/index.js';

// Valores de ejemplo del template original (docs/template-original.html)
const ejemplo = {
  supCubierta: 120,
  supDescubierta: 15,
  precioBaseM2: 1800,
  estado: 'bueno',
  disposicion: 'frente',
  margenNegociacion: 5,
  incluyeLlave: true,
  cantConsultorios: 4,
  canonModulo: 400,
  ocupacionPct: 75,
  gastosFijos: 350,
  multiploEbitda: 2,
};

test('replica el cálculo del template original', () => {
  const r = calcularTasacion(ejemplo);
  assert.equal(r.inmueble.supHomogenea, 127.5);
  assert.equal(Math.round(r.inmueble.valor), 218025); // 127.5 × 1800 × 0.95
  assert.equal(r.llave.ingresosMensuales, 1200);
  assert.equal(r.llave.valor, 20400); // (1200 − 350) × 12 × 2
  assert.equal(Math.round(r.total), 238425);
});

test('sin llave, el valor de la llave es 0', () => {
  const r = calcularTasacion({ ...ejemplo, incluyeLlave: false });
  assert.equal(r.llave.valor, 0);
  assert.equal(r.total, r.inmueble.valor);
});

test('aplica coeficientes de estado y disposición', () => {
  const r = calcularTasacion({ ...ejemplo, estado: 'regular', disposicion: 'interno', margenNegociacion: 0 });
  assert.equal(Math.round(r.inmueble.valor), Math.round(127.5 * 1800 * 0.9 * 0.9));
});

test('EBITDA negativo no resta valor y genera advertencia', () => {
  const r = calcularTasacion({ ...ejemplo, gastosFijos: 5000 });
  assert.equal(r.llave.valor, 0);
  assert.equal(r.advertencias.length, 1);
});

test('entradas inválidas se normalizan sin romper', () => {
  const r = calcularTasacion({ supCubierta: '-10', precioBaseM2: 'abc', estado: 'inexistente', margenNegociacion: 500 });
  assert.equal(r.total, 0);
  assert.equal(r.datos.estado, 'bueno');
  assert.equal(r.datos.margenNegociacion, 100);
});

test('validarDatos exige superficie y precio', () => {
  const campos = validarDatos({}).map((e) => e.campo);
  assert.deepEqual(campos, ['supCubierta', 'precioBaseM2']);
  assert.equal(validarDatos(ejemplo).length, 0);
});
