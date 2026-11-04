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

/** Campos descriptivos (no afectan el valor). */
const CAMPOS_PROPIEDAD = ['direccion', 'tipo', 'cliente', 'observaciones'];

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

  $('#hintDescubierta').textContent = `Computa al ${fmtNum(coef.factorSuperficieDescubierta * 100)}%`;
}

/** Lee el formulario y lo separa en datos de cálculo y datos de la propiedad. */
export function leerFormulario(form) {
  const el = form.elements;
  const datos = { incluyeLlave: el.incluyeLlave.checked };
  for (const campo of CAMPOS_DATOS) datos[campo] = el[campo].value;

  const propiedad = {};
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

  sincronizarLlave(form);
  limpiarErrores(form);
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
