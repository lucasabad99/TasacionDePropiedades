import { JURISDICCIONES, zonasDe } from '@tasador/shared';
import { escapeHtml, fmtAjuste, fmtNum } from '../lib/format.js';

/** Campos numéricos/selección que entran en el cálculo. */
const CAMPOS_DATOS = [
  'supCubierta',
  'supDescubierta',
  'precioBaseM2',
  'estado',
  'disposicion',
  'margenNegociacion',
  'cantConsultorios',
  'canonModulo',
  'ocupacionPct',
  'gastosFijos',
  'multiploEbitda',
];

/** Campos descriptivos (no afectan el cálculo; la ubicación define el precio de referencia). */
const CAMPOS_PROPIEDAD = ['direccion', 'tipo', 'cliente', 'observaciones', 'jurisdiccion', 'zona', 'ambientes'];

const AMBIENTES_POR_DEFECTO = '2';

const chip = (name, value, label, meta) => `
  <label class="chip">
    <input type="radio" name="${name}" value="${escapeHtml(value)}" />
    <span class="chip-body">${escapeHtml(label)}<span class="chip-meta">${escapeHtml(meta)}</span></span>
  </label>`;

const opcionMultiplo = (m) => `
  <label class="option">
    <input type="radio" name="multiploEbitda" value="${m.valor}" />
    <span class="option-body">
      <span class="option-valor">${fmtNum(m.valor, 1)} años</span>
      <span class="option-label">${escapeHtml(m.label)}</span>
      <span class="option-detalle">${escapeHtml(m.detalle)}</span>
    </span>
  </label>`;

/** Dibuja las opciones (chips, selects) a partir de los coeficientes. */
export function renderOpciones(form, coef) {
  const $ = (sel) => form.querySelector(sel);

  $('[data-opciones="estados"]').innerHTML = coef.estados
    .map((e) => chip('estado', e.id, e.label, fmtAjuste(e.coef)))
    .join('');

  $('[data-opciones="disposiciones"]').innerHTML = coef.disposiciones
    .map((d) => chip('disposicion', d.id, d.label, fmtAjuste(d.coef)))
    .join('');

  $('[data-opciones="multiplos"]').innerHTML = coef.multiplosEbitda.map(opcionMultiplo).join('');

  $('[data-opciones="tipos"]').innerHTML =
    '<option value="">Seleccionar…</option>' +
    coef.tiposPropiedad.map((t) => `<option>${escapeHtml(t)}</option>`).join('');

  $('[data-opciones="jurisdicciones"]').innerHTML =
    '<option value="">Seleccionar…</option>' +
    JURISDICCIONES.map((j) => `<option value="${j.id}">${escapeHtml(j.label)}</option>`).join('');

  $('#hintDescubierta').textContent = `Computa al ${fmtNum(coef.factorSuperficieDescubierta * 100)}%`;
}

/** Lee el formulario y lo separa en datos de cálculo y datos de la propiedad. */
export function leerFormulario(form) {
  const el = form.elements;
  const datos = { incluyeLlave: el.incluyeLlave.checked };
  for (const campo of CAMPOS_DATOS) datos[campo] = el[campo].value;

  const propiedad = { aEstrenar: el.aEstrenar.checked };
  for (const campo of CAMPOS_PROPIEDAD) propiedad[campo] = el[campo].value.trim();

  return { datos, propiedad };
}

/** Carga valores en el formulario (tasación del historial, borrador, o nueva). */
export function cargarFormulario(form, { datos = {}, propiedad = {} }) {
  const el = form.elements;
  for (const campo of CAMPOS_DATOS) {
    if (datos[campo] !== undefined) el[campo].value = datos[campo] === 0 ? '' : String(datos[campo]);
  }
  // Los porcentajes en 0 sí se muestran (0% es un valor válido y explícito)
  for (const campo of ['margenNegociacion', 'ocupacionPct']) {
    if (datos[campo] !== undefined) el[campo].value = String(datos[campo]);
  }
  el.incluyeLlave.checked = Boolean(datos.incluyeLlave === true || datos.incluyeLlave === 'true');

  for (const campo of CAMPOS_PROPIEDAD) el[campo].value = propiedad[campo] ?? '';
  el.ambientes.value = propiedad.ambientes || AMBIENTES_POR_DEFECTO;
  el.aEstrenar.checked = propiedad.aEstrenar === true || propiedad.aEstrenar === 'true';
  // Las opciones de barrio/partido dependen de la ubicación: se cargan antes de elegir la zona
  actualizarZonas(form, propiedad.zona ?? '');

  sincronizarLlave(form);
  limpiarErrores(form);
}

/**
 * Carga el selector "Barrio / Partido" según la ubicación elegida.
 * Conserva la zona elegida si sigue siendo válida.
 */
export function actualizarZonas(form, zonaElegida = form.elements.zona.value) {
  const { jurisdiccion, zona } = form.elements;
  const zonas = zonasDe(jurisdiccion.value);

  form.querySelector('#labelZona').textContent =
    jurisdiccion.value === 'caba' ? 'Barrio' : jurisdiccion.value === 'provincia' ? 'Partido' : 'Barrio / Partido';

  zona.disabled = zonas.length === 0;
  zona.innerHTML = zonas.length
    ? '<option value="">Seleccionar…</option>' +
      zonas.map((z) => `<option>${escapeHtml(z)}</option>`).join('') +
      (jurisdiccion.value === 'provincia' ? '<option value="otro">Otro (sin referencia)</option>' : '')
    : '<option value="">Elegí primero la ubicación</option>';
  zona.value = zonas.includes(zonaElegida) || zonaElegida === 'otro' ? zonaElegida : '';
}

/** Muestra u oculta la sección de llave según el switch. */
export function sincronizarLlave(form) {
  const activa = form.elements.incluyeLlave.checked;
  form.querySelector('#seccionLlave').hidden = !activa;
  form.querySelector('[data-llave-off]').hidden = activa;
  form.elements.incluyeLlave.setAttribute('aria-expanded', String(activa));
}

export function marcarErrores(form, errores) {
  limpiarErrores(form);
  for (const { campo } of errores) form.elements[campo]?.setAttribute('aria-invalid', 'true');
  form.elements[errores[0]?.campo]?.focus();
}

export function limpiarErrores(form) {
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
}

export function limpiarError(campo) {
  campo?.removeAttribute?.('aria-invalid');
}
