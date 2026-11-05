import '../lib/pwa.js';
import '../styles/app.css';
import '../styles/panel.css';
import '../styles/print.css';

import { COEFICIENTES } from '@tasador/shared';
import { appConfig } from '../config/app.js';
import {
  escapeHtml,
  fmtFecha,
  fmtFechaCorta,
  fmtHace,
  fmtNum,
  fmtUSD,
  fmtUSDCompacto,
  iniciales,
} from '../lib/format.js';
import { api } from '../services/api.js';
import { requerirSesion } from '../services/sesion.js';
import { prepararReporte } from '../ui/reporte.js';
import { filasDesglose } from '../ui/resultados.js';
import { toast } from '../ui/toast.js';
import { renderTopbar } from '../ui/topbar.js';

/**
 * Panel de tasaciones.
 *  - Admin: todas las tasaciones, resumen por agente y filtro por agente.
 *  - Agente: solo las suyas (el backend ya las filtra) con sus indicadores.
 */
const sesion = requerirSesion();
const esAdmin = sesion?.usuario.rol === 'admin';

const SIN_ASIGNAR = 'sin-asignar';
const ROL_LABEL = { admin: 'Administrador', agente: 'Agente' };

const estado = {
  agentes: [],
  tasaciones: [],
  agenteId: '',
  busqueda: '',
  detalle: null,
};

const $ = (id) => document.getElementById(id);
const idAgente = (t) => t.agente?.id ?? SIN_ASIGNAR;
const nombreAgente = (id) => estado.agentes.find((a) => a.id === id)?.nombre ?? '';
const sinAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const suma = (lista) => lista.reduce((acc, t) => acc + t.resultado.total, 0);

// ---------- Datos ----------
async function cargar() {
  try {
    const [agentes, tasaciones] = await Promise.all([
      esAdmin ? api.resumenAgentes() : [],
      api.listarTasaciones(),
    ]);
    estado.agentes = agentes;
    estado.tasaciones = tasaciones;
    // Si el agente filtrado ya no existe, se quita el filtro
    if (estado.agenteId && !agentes.some((a) => a.id === estado.agenteId)) estado.agenteId = '';
    render();
  } catch (err) {
    $('agentes').innerHTML = `<p class="estado-vacio">${escapeHtml(err.message)}</p>`;
    $('filas').innerHTML = `<tr><td colspan="5" class="tabla-vacia">${escapeHtml(err.message)}</td></tr>`;
    toast(err.message, 'error');
  }
}

function filtradas() {
  const q = sinAcentos(estado.busqueda.trim());
  return estado.tasaciones.filter((t) => {
    if (estado.agenteId && idAgente(t) !== estado.agenteId) return false;
    if (!q) return true;
    const p = t.propiedad;
    return sinAcentos(`${p.direccion} ${p.cliente} ${p.tipo}`).includes(q);
  });
}

// ---------- Render ----------
function render() {
  const lista = filtradas();
  renderKpis(lista);
  if (esAdmin) {
    renderAgentes();
    renderFiltroAgente();
  }
  renderTabla(lista);
}

/** Cuántas tasaciones de la lista se hicieron este mes y el mes anterior. */
function porMes(lista) {
  const hoy = new Date();
  const clave = (d) => d.getFullYear() * 12 + d.getMonth();
  const actual = clave(hoy);
  let esteMes = 0;
  let mesPasado = 0;
  for (const t of lista) {
    const k = clave(new Date(t.creadaEn));
    if (k === actual) esteMes++;
    else if (k === actual - 1) mesPasado++;
  }
  return { esteMes, mesPasado };
}

const kpi = (label, valor, sub = '') => `
  <div class="kpi">
    <span class="kpi-label">${escapeHtml(label)}</span>
    <strong class="kpi-valor">${escapeHtml(valor)}</strong>
    <span class="kpi-sub">${escapeHtml(sub)}</span>
  </div>`;

function renderKpis(lista) {
  const total = suma(lista);
  const conLlave = lista.filter((t) => t.resultado.llave?.incluida).length;
  const ultima = lista[0];

  const { esteMes, mesPasado } = porMes(lista);

  const alcance = [];
  if (esAdmin) alcance.push(estado.agenteId ? nombreAgente(estado.agenteId) : 'Todos los agentes');
  else alcance.push('Tus tasaciones');
  if (estado.busqueda.trim()) alcance.push(`búsqueda “${estado.busqueda.trim()}”`);
  $('kpisAlcance').textContent = alcance.join(' · ');

  $('kpis').innerHTML = [
    kpi('Tasaciones', fmtNum(lista.length), conLlave ? `${conLlave} con llave de negocio` : 'Sin llave de negocio'),
    kpi('Este mes', fmtNum(esteMes), `${fmtNum(mesPasado)} el mes pasado`),
    kpi('Valor total tasado', fmtUSDCompacto(total), lista.length ? `Promedio ${fmtUSDCompacto(total / lista.length)}` : 'Suma de los totales sugeridos'),
    kpi('Última tasación', ultima ? fmtHace(ultima.creadaEn) : '—', ultima?.propiedad.direccion || ''),
  ].join('');
}

function renderAgentes() {
  const totalGeneral = estado.agentes.reduce((acc, a) => acc + a.valorTotal, 0);

  if (!estado.agentes.length) {
    $('agentes').innerHTML = '<p class="estado-vacio">No hay agentes cargados.</p>';
    return;
  }

  $('agentes').innerHTML = estado.agentes
    .map((a) => {
      const pct = totalGeneral > 0 ? (a.valorTotal / totalGeneral) * 100 : 0;
      const seleccionado = a.id === estado.agenteId;
      const subtitulo = [a.usuario && `@${a.usuario}`, ROL_LABEL[a.rol]].filter(Boolean).join(' · ');

      const cuerpo = a.cantidad
        ? `
          <dl class="agente-stats">
            <div><dt>Valor tasado</dt><dd>${fmtUSDCompacto(a.valorTotal)}</dd></div>
            <div><dt>Promedio</dt><dd>${fmtUSDCompacto(a.valorTotal / a.cantidad)}</dd></div>
          </dl>
          <div class="meter" role="img" aria-label="${fmtNum(pct)}% del valor total tasado">
            <span style="width:${pct.toFixed(1)}%"></span>
          </div>
          <div class="agente-pie">
            <span>${fmtNum(pct)}% del valor total</span>
            <span>Última: ${escapeHtml(fmtHace(a.ultima))}</span>
          </div>`
        : '<p class="agente-vacio">Sin tasaciones todavía</p>';

      return `
        <button type="button" class="agente-card${a.cantidad ? '' : ' sin-datos'}" data-id="${escapeHtml(a.id)}" aria-pressed="${seleccionado}">
          <div class="agente-top">
            <span class="avatar">${escapeHtml(iniciales(a.nombre))}</span>
            <span class="agente-nombre">
              <strong>${escapeHtml(a.nombre)}</strong>
              <small>${escapeHtml(subtitulo)}</small>
            </span>
            ${a.cantidad ? `<span class="agente-cantidad">${fmtNum(a.cantidad)} ${a.cantidad === 1 ? 'tasación' : 'tasaciones'}</span>` : ''}
          </div>
          ${cuerpo}
        </button>`;
    })
    .join('');

  $('btnVerTodos').hidden = !estado.agenteId;
}

function renderFiltroAgente() {
  $('filtroAgente').innerHTML =
    '<option value="">Todos los agentes</option>' +
    estado.agentes
      .map((a) => `<option value="${escapeHtml(a.id)}"${a.id === estado.agenteId ? ' selected' : ''}>${escapeHtml(a.nombre)}</option>`)
      .join('');
}

function renderTabla(lista) {
  $('tituloTabla').textContent = !esAdmin
    ? 'Mis tasaciones'
    : estado.agenteId
      ? `Tasaciones de ${nombreAgente(estado.agenteId)}`
      : 'Todas las tasaciones';
  $('conteo').textContent = `${fmtNum(lista.length)} ${lista.length === 1 ? 'resultado' : 'resultados'}`;

  if (!lista.length) {
    $('filas').innerHTML = `<tr><td colspan="5" class="tabla-vacia">${
      estado.tasaciones.length
        ? 'No hay tasaciones con estos filtros.'
        : esAdmin
          ? 'Todavía no hay tasaciones guardadas.'
          : 'Todavía no guardaste tasaciones. Tocá “Nueva tasación” para empezar.'
    }</td></tr>`;
    return;
  }

  $('filas').innerHTML = lista
    .map((t) => {
      const p = t.propiedad;
      const llave = t.resultado.llave?.incluida ? '<span class="tag">+ llave</span>' : '';
      return `
        <tr data-id="${escapeHtml(t.id)}" tabindex="0">
          <td data-label="Fecha"><span title="${escapeHtml(fmtFecha(t.creadaEn))}">${escapeHtml(fmtFechaCorta(t.creadaEn))}</span></td>
          <td data-label="Propiedad" class="col-propiedad">
            <strong>${escapeHtml(p.direccion || 'Sin dirección')}</strong>
            <small>${escapeHtml(p.tipo || 'Sin tipo')} ${llave}</small>
          </td>
          <td data-label="Cliente">${escapeHtml(p.cliente || '—')}</td>
          <td data-label="Agente" class="col-agente">
            <span class="agente-mini"><span class="avatar avatar-sm">${escapeHtml(iniciales(t.agente?.nombre))}</span>${escapeHtml(t.agente?.nombre ?? 'Sin asignar')}</span>
          </td>
          <td data-label="Total" class="num"><strong>${fmtUSD(t.resultado.total)}</strong></td>
        </tr>`;
    })
    .join('');
}

// ---------- Detalle ----------
const dato = (label, valor) =>
  `<div class="det-dato"><span>${escapeHtml(label)}</span><strong>${escapeHtml(valor || '—')}</strong></div>`;

function abrirDetalle(id) {
  const t = estado.tasaciones.find((x) => x.id === id);
  if (!t) return;
  estado.detalle = t;

  const r = { ...t.resultado, datos: t.datos };
  const p = t.propiedad;

  $('detTitulo').textContent = p.direccion || 'Propiedad sin dirección';
  $('detCuerpo').innerHTML = `
    <div class="det-total">
      <span>Valor total sugerido</span>
      <strong>${fmtUSD(r.total)}</strong>
    </div>
    <div class="det-datos">
      ${dato('Agente', t.agente?.nombre ?? 'Sin asignar')}
      ${dato('Fecha', fmtFecha(t.creadaEn))}
      ${dato('Tipo', p.tipo)}
      ${dato('Cliente', p.cliente)}
    </div>
    <div class="det-desglose">
      ${filasDesglose(r)
        .map((f) =>
          f.grupo
            ? `<div class="desglose-grupo">${escapeHtml(f.grupo)}</div>`
            : `<div class="desglose-fila ${f.clase ?? ''}"><span>${escapeHtml(f.label)}</span><span>${escapeHtml(f.valor)}</span></div>`,
        )
        .join('')}
    </div>
    ${p.observaciones ? `<div class="det-obs"><span>Observaciones</span><p>${escapeHtml(p.observaciones)}</p></div>` : ''}`;

  $('dlgDetalle').showModal();
}

async function eliminarDetalle() {
  const t = estado.detalle;
  if (!t || !confirm(`¿Eliminar la tasación de "${t.propiedad.direccion || 'esta propiedad'}"? No se puede deshacer.`)) return;
  try {
    await api.eliminarTasacion(t.id);
    $('dlgDetalle').close();
    toast('Tasación eliminada.');
    await cargar();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function imprimirDetalle() {
  const t = estado.detalle;
  if (!t) return;
  prepararReporte($('reporte'), {
    propiedad: t.propiedad,
    resultado: { ...t.resultado, datos: t.datos },
    nombreInmobiliaria: appConfig.nombreInmobiliaria,
    tasador: t.agente?.nombre,
    fecha: t.creadaEn,
  });
  window.print();
}

// ---------- Exportar CSV (abre directo en Excel) ----------
function exportarCSV() {
  const lista = filtradas();
  if (!lista.length) {
    toast('No hay tasaciones para exportar.');
    return;
  }

  const label = (coleccion, id) => COEFICIENTES[coleccion].find((x) => x.id === id)?.label ?? id;
  const fecha = (iso) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  const entero = (n) => Math.round(n || 0);

  const columnas = [
    ['Fecha', (t) => fecha(t.creadaEn)],
    ['Agente', (t) => t.agente?.nombre ?? 'Sin asignar'],
    ['Dirección', (t) => t.propiedad.direccion],
    ['Tipo', (t) => t.propiedad.tipo],
    ['Cliente', (t) => t.propiedad.cliente],
    ['Sup. cubierta (m²)', (t) => t.datos.supCubierta],
    ['Sup. descubierta (m²)', (t) => t.datos.supDescubierta],
    ['Precio base (USD/m²)', (t) => t.datos.precioBaseM2],
    ['Estado', (t) => label('estados', t.datos.estado)],
    ['Disposición', (t) => label('disposiciones', t.datos.disposicion)],
    ['Valor inmueble (USD)', (t) => entero(t.resultado.inmueble.valor)],
    ['Incluye llave', (t) => (t.resultado.llave?.incluida ? 'Sí' : 'No')],
    ['Valor llave (USD)', (t) => entero(t.resultado.llave?.valor)],
    ['Total (USD)', (t) => entero(t.resultado.total)],
  ];

  const celda = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // evita que Excel lo interprete como fórmula
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const filas = [columnas.map(([titulo]) => titulo), ...lista.map((t) => columnas.map(([, fn]) => fn(t)))];
  const csv = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const prefijo = esAdmin ? 'tasaciones' : `tasaciones-${sesion.usuario.usuario}`;
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `${prefijo}-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Eventos ----------
function filtrarPorAgente(id) {
  estado.agenteId = id;
  render();
}

function iniciar({ usuario }) {
  document.querySelectorAll('[data-app="nombre"]').forEach((el) => (el.textContent = appConfig.nombreInmobiliaria));
  const titulo = esAdmin ? 'Panel de administración' : 'Mi panel';
  document.title = `${titulo} · ${appConfig.nombreInmobiliaria}`;
  $('marcaSub').textContent = titulo;
  $('panelTitulo').textContent = esAdmin ? titulo : `Hola, ${usuario.nombre.split(' ')[0]}`;
  $('panelSubtitulo').textContent = esAdmin
    ? 'Tasaciones realizadas por cada agente'
    : 'Tus tasaciones y cómo vas este mes';
  document.body.classList.toggle('vista-agente', !esAdmin);
  document.querySelectorAll('[data-solo-admin]').forEach((el) => (el.hidden = !esAdmin));
  renderTopbar($('topbarAcciones'), usuario, { pagina: 'panel' });

  $('agentes').addEventListener('click', (e) => {
    const card = e.target.closest('.agente-card');
    if (card) filtrarPorAgente(card.dataset.id === estado.agenteId ? '' : card.dataset.id);
  });
  $('btnVerTodos').addEventListener('click', () => filtrarPorAgente(''));
  $('filtroAgente').addEventListener('change', (e) => filtrarPorAgente(e.target.value));

  let espera;
  $('buscar').addEventListener('input', (e) => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      estado.busqueda = e.target.value;
      render();
    }, 150);
  });

  const filas = $('filas');
  filas.addEventListener('click', (e) => {
    const fila = e.target.closest('tr[data-id]');
    if (fila) abrirDetalle(fila.dataset.id);
  });
  filas.addEventListener('keydown', (e) => {
    const fila = e.target.closest('tr[data-id]');
    if (fila && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      abrirDetalle(fila.dataset.id);
    }
  });

  const dlg = $('dlgDetalle');
  dlg.querySelector('[data-cerrar]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
  $('detEliminar').addEventListener('click', eliminarDetalle);
  $('detImprimir').addEventListener('click', imprimirDetalle);
  $('btnExportar').addEventListener('click', exportarCSV);

  cargar();
}

if (sesion) iniciar(sesion);
