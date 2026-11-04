import { escapeHtml, fmtUSD } from '../lib/format.js';
import { filasDesglose } from './resultados.js';

const filaDato = (label, valor) =>
  valor ? `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(valor)}</td></tr>` : '';

/** Arma el reporte que se imprime / guarda como PDF. */
export function prepararReporte(el, { propiedad, resultado, nombreInmobiliaria, tasador, fecha = new Date() }) {
  const hoy = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date(fecha));

  const datosPropiedad = [
    filaDato('Dirección', propiedad.direccion),
    filaDato('Tipo', propiedad.tipo),
    filaDato('Cliente / Propietario', propiedad.cliente),
    filaDato('Tasado por', tasador),
  ].join('');

  const desglose = filasDesglose(resultado)
    .map((f) =>
      f.grupo
        ? `</table><h2>${escapeHtml(f.grupo)}</h2><table>`
        : `<tr class="${f.clase === 'subtotal' ? 'subtotal' : ''}"><td>${escapeHtml(f.label)}</td><td>${escapeHtml(f.valor)}</td></tr>`,
    )
    .join('');

  el.innerHTML = `
    <header class="rep-head">
      <div>
        <h1>${escapeHtml(nombreInmobiliaria)}</h1>
        <p>Informe de tasación</p>
      </div>
      <p>${escapeHtml(hoy)}</p>
    </header>

    <div class="rep-total">
      <span>Valor total sugerido</span>
      <strong>${fmtUSD(resultado.total)}</strong>
    </div>

    ${datosPropiedad ? `<h2>Propiedad</h2><table>${datosPropiedad}</table>` : ''}

    <table>${desglose}</table>

    ${propiedad.observaciones ? `<h2>Observaciones</h2><p class="rep-obs">${escapeHtml(propiedad.observaciones)}</p>` : ''}

    <p class="rep-legal">
      Valor estimativo elaborado según los datos relevados en la visita y referencias de mercado
      de la zona. No constituye una tasación oficial ni compromete el precio final de la operación.
    </p>`;
}
