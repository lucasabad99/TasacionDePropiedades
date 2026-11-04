import { escapeHtml, fmtCoef, fmtNum, fmtUSD } from '../lib/format.js';

const fila = (label, valor, clase = '') =>
  `<div class="desglose-fila ${clase}"><span>${escapeHtml(label)}</span><span>${escapeHtml(valor)}</span></div>`;

const grupo = (titulo) => `<div class="desglose-grupo">${escapeHtml(titulo)}</div>`;

/** Filas del desglose; también las usa el reporte impreso. */
export function filasDesglose(r) {
  const { datos: d, inmueble: i, llave: l } = r;
  const filas = [
    { grupo: 'Inmueble' },
    { label: 'Superficie homogeneizada', valor: `${fmtNum(i.supHomogenea, 2)} m²` },
    { label: 'Precio base de la zona', valor: `${fmtUSD(d.precioBaseM2)}/m²` },
    { label: 'Coef. estado × disposición', valor: `${fmtCoef(i.coefEstado)} × ${fmtCoef(i.coefDisposicion)}` },
    { label: 'Valor de lista', valor: fmtUSD(i.valorLista) },
    { label: `Margen de negociación (${fmtNum(d.margenNegociacion, 2)}%)`, valor: `− ${fmtUSD(i.descuentoNegociacion)}`, clase: 'resta' },
    { label: 'Valor del inmueble', valor: fmtUSD(i.valor), clase: 'subtotal' },
  ];

  if (l.incluida) {
    filas.push(
      { grupo: 'Llave de negocio' },
      { label: `Ingresos (${fmtNum(d.cantConsultorios)} × ${fmtUSD(d.canonModulo)} × ${fmtNum(d.ocupacionPct, 2)}%)`, valor: `${fmtUSD(l.ingresosMensuales)}/mes` },
      { label: 'Gastos fijos', valor: `− ${fmtUSD(l.gastosFijos)}/mes`, clase: 'resta' },
      { label: 'EBITDA anual', valor: fmtUSD(l.ebitdaAnual) },
      { label: 'Múltiplo aplicado', valor: `× ${fmtNum(l.multiplo, 1)} años` },
      { label: 'Valor de la llave', valor: fmtUSD(l.valor), clase: 'subtotal' },
    );
  }
  return filas;
}

export function renderResultados(r) {
  const $$ = (key) => document.querySelectorAll(`[data-res="${key}"]`);
  const set = (key, texto) => $$(key).forEach((el) => (el.textContent = texto));

  set('total', fmtUSD(r.total));
  set('inmueble', fmtUSD(r.inmueble.valor));

  $$('llave').forEach((el) => {
    el.textContent = r.llave.incluida ? fmtUSD(r.llave.valor) : 'No incluida';
    el.classList.toggle('muted', !r.llave.incluida);
  });

  set(
    'm2',
    r.inmueble.valorM2 > 0
      ? `Inmueble a ${fmtUSD(r.inmueble.valorM2)}/m² homogeneizado`
      : 'Completá superficie y precio base',
  );

  $$('alertas').forEach((el) => {
    el.innerHTML = r.advertencias.map((a) => `<li>${escapeHtml(a)}</li>`).join('');
  });

  $$('desglose').forEach((el) => {
    el.innerHTML = filasDesglose(r)
      .map((f) => (f.grupo ? grupo(f.grupo) : fila(f.label, f.valor, f.clase)))
      .join('');
  });
}
