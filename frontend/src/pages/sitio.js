import '../styles/app.css';
import '../styles/sitio.css';

import { COEFICIENTES, JURISDICCIONES } from '@tasador/shared';
import { appConfig } from '../config/app.js';
import { sitio } from '../config/sitio.js';
import { escapeHtml, fmtCoef, fmtFechaCorta, fmtNum, fmtUSD, iniciales } from '../lib/format.js';
import { api } from '../services/api.js';
import { TASADOR, obtenerSesion } from '../services/sesion.js';
import { urlFoto } from '../ui/fotos.js';
import { toast } from '../ui/toast.js';

/**
 * Página pública: propiedades publicadas por los agentes, historia y contacto.
 * No requiere sesión. Nunca muestra datos del cliente / propietario (el backend ya no los manda).
 */

const $ = (id) => document.getElementById(id);
const estado = { propiedades: [], ubicacion: '', busqueda: '', consultaPor: null };

const sinAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const etiqueta = (coleccion, id) => COEFICIENTES[coleccion].find((x) => x.id === id)?.label ?? '';
const nombreJurisdiccion = (id) => JURISDICCIONES.find((j) => j.id === id)?.label ?? '';
const textoAmbientes = (n) => (!n ? '' : n >= 4 ? '4+ amb.' : `${n} amb.`);

/** "Departamento en Palermo" / "Casa en La Plata" / "Propiedad" */
function titulo(t) {
  const p = t.propiedad;
  const tipo = p.tipo || 'Propiedad';
  return p.zona ? `${tipo} en ${p.zona}` : tipo;
}

const ICONO_CASA =
  '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/></svg>';
const ICONO_CAMARA =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';

// ---------- Propiedades ----------
function filtradas() {
  const q = sinAcentos(estado.busqueda.trim());
  return estado.propiedades.filter((t) => {
    if (estado.ubicacion && t.propiedad.jurisdiccion !== estado.ubicacion) return false;
    if (!q) return true;
    const p = t.propiedad;
    return sinAcentos(`${p.tipo} ${p.zona} ${p.direccion} ${t.agente.nombre} ${nombreJurisdiccion(p.jurisdiccion)}`).includes(q);
  });
}

function tarjeta(t) {
  const p = t.propiedad;
  const portada = t.fotos[0];
  const specs = [
    textoAmbientes(p.ambientes),
    t.resultado.inmueble.supHomogenea ? `${fmtNum(t.resultado.inmueble.supHomogenea, 0)} m²` : '',
    etiqueta('estados', t.datos.estado),
    p.aEstrenar ? 'A estrenar' : '',
  ].filter(Boolean);

  return `
    <button type="button" class="tarjeta" data-id="${escapeHtml(t.id)}" aria-label="Ver ${escapeHtml(titulo(t))}">
      <div class="tarjeta-foto">
        ${
          portada
            ? `<img src="${escapeHtml(urlFoto(portada.id))}" alt="" loading="lazy" />`
            : `<div class="tarjeta-sin-foto">${ICONO_CASA}</div>`
        }
        ${p.jurisdiccion ? `<span class="tarjeta-badge">${p.jurisdiccion === 'caba' ? 'CABA' : 'Provincia'}</span>` : ''}
        ${t.fotos.length > 1 ? `<span class="tarjeta-nfotos">${ICONO_CAMARA}${t.fotos.length}</span>` : ''}
      </div>
      <div class="tarjeta-cuerpo">
        <span class="tarjeta-tipo">${escapeHtml(p.tipo || 'Propiedad')}</span>
        <span class="tarjeta-titulo">${escapeHtml(p.zona || p.direccion || 'Ubicación a consultar')}</span>
        ${p.zona && p.direccion ? `<span class="tarjeta-dir">${escapeHtml(p.direccion)}</span>` : ''}
        ${specs.length ? `<span class="tarjeta-specs">${specs.map((s) => `<span>${escapeHtml(s)}</span>`).join('')}</span>` : ''}
        <span class="tarjeta-valor"><small>Valor estimado</small>${fmtUSD(t.resultado.total)}</span>
      </div>
      <div class="tarjeta-agente">
        <span class="avatar" aria-hidden="true">${escapeHtml(iniciales(t.agente.nombre))}</span>
        <span>Cargada por <strong>${escapeHtml(t.agente.nombre)}</strong></span>
        <small>${escapeHtml(fmtFechaCorta(t.creadaEn))}</small>
      </div>
    </button>`;
}

function renderTarjetas() {
  const lista = filtradas();
  $('conteo').textContent = `${lista.length} de ${estado.propiedades.length}`;
  $('tarjetas').innerHTML = lista.length
    ? lista.map(tarjeta).join('')
    : `<p class="estado-vacio">${estado.propiedades.length ? 'No hay propiedades con ese filtro.' : 'Todavía no hay propiedades publicadas.'}</p>`;
}

async function cargarPropiedades() {
  try {
    estado.propiedades = await api.propiedadesPublicas();
    renderTarjetas();
    abrirDesdeUrl();
  } catch (err) {
    $('tarjetas').innerHTML = `<p class="estado-vacio">${escapeHtml(err.message)}</p>`;
  }
}

// ---------- Detalle ----------
const fila = (label, valor, clase = '') =>
  valor === '' || valor == null
    ? ''
    : `<div class="det-fila ${clase}"><span>${escapeHtml(label)}</span><span>${escapeHtml(valor)}</span></div>`;

const grupo = (tituloGrupo, filas) => {
  const html = filas.join('');
  return html ? `<section class="det-grupo"><h3>${escapeHtml(tituloGrupo)}</h3><div class="det-tabla">${html}</div></section>` : '';
};

function detalle(t) {
  const { propiedad: p, datos: d, resultado: r } = t;
  const i = r.inmueble;
  const l = r.llave ?? {};
  const ubicacion = [p.zona, nombreJurisdiccion(p.jurisdiccion)].filter(Boolean).join(', ');

  const galeria = t.fotos.length
    ? `<div class="galeria">${t.fotos
        .map((f, n) => `<img src="${escapeHtml(urlFoto(f.id))}" alt="Foto ${n + 1} de ${t.fotos.length}" loading="lazy" />`)
        .join('')}</div>
       ${t.fotos.length > 1 ? `<p class="galeria-nota">${t.fotos.length} fotos · deslizá para ver más</p>` : ''}`
    : '';

  const ref = p.referencia;

  return `
    ${galeria}
    <div class="det-cabecera">
      <span class="tarjeta-tipo">${escapeHtml(p.tipo || 'Propiedad')}</span>
      <span class="tarjeta-titulo">${escapeHtml(ubicacion || p.direccion || 'Ubicación a consultar')}</span>
      ${p.direccion && ubicacion ? `<span class="tarjeta-dir">${escapeHtml(p.direccion)}</span>` : ''}
      <div class="det-total"><strong>${fmtUSD(r.total)}</strong><span>valor estimado</span></div>
    </div>

    ${grupo('Propiedad', [
      fila('Tipo', p.tipo),
      fila('Dirección', p.direccion),
      fila('Ubicación', ubicacion),
      fila('Ambientes', p.ambientes ? (p.ambientes >= 4 ? '4 o más' : String(p.ambientes)) : ''),
      fila('Antigüedad', p.aEstrenar ? 'A estrenar' : 'Usado'),
      fila('Estado de conservación', etiqueta('estados', d.estado)),
      fila('Disposición', etiqueta('disposiciones', d.disposicion)),
    ])}

    ${grupo('Superficies', [
      fila('Cubierta', d.supCubierta ? `${fmtNum(d.supCubierta, 2)} m²` : ''),
      fila('Descubierta', d.supDescubierta ? `${fmtNum(d.supDescubierta, 2)} m²` : ''),
      fila('Homogeneizada', `${fmtNum(i.supHomogenea, 2)} m²`),
    ])}

    ${grupo('Valoración', [
      fila('Precio base de la zona', `${fmtUSD(d.precioBaseM2)}/m²`),
      fila('Coef. estado × disposición', `${fmtCoef(i.coefEstado)} × ${fmtCoef(i.coefDisposicion)}`),
      fila('Valor de lista', fmtUSD(i.valorLista)),
      fila(`Margen de negociación (${fmtNum(d.margenNegociacion, 2)}%)`, `− ${fmtUSD(i.descuentoNegociacion)}`),
      fila('Valor del inmueble', fmtUSD(i.valor), 'destacada'),
      ...(l.incluida
        ? [
            fila('Consultorios', fmtNum(d.cantConsultorios)),
            fila('Canon por módulo', `${fmtUSD(d.canonModulo)}/mes`),
            fila('Ocupación', `${fmtNum(d.ocupacionPct, 2)}%`),
            fila('EBITDA anual', fmtUSD(l.ebitdaAnual)),
            fila('Múltiplo', `${fmtNum(l.multiplo, 1)} años`),
            fila('Valor de la llave de negocio', fmtUSD(l.valor), 'destacada'),
          ]
        : []),
      fila('Valor total estimado', fmtUSD(r.total), 'destacada'),
    ])}

    ${
      ref
        ? `<section class="det-grupo"><h3>Referencia de mercado</h3>
             <div class="det-tabla">${fila('Precio de referencia', `${fmtUSD(ref.usdM2)}/m²`)}${fila('Detalle', ref.detalle)}</div>
             <p class="det-fuente">Fuente: ${ref.url ? `<a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener">${escapeHtml(ref.fuente)}</a>` : escapeHtml(ref.fuente)} · ${escapeHtml(ref.periodo)}. Precio de publicación, no de escritura.</p>
           </section>`
        : ''
    }

    ${p.observaciones ? `<section class="det-grupo"><h3>Observaciones</h3><p class="det-obs">${escapeHtml(p.observaciones)}</p></section>` : ''}

    <div class="det-agente">
      <span class="avatar" aria-hidden="true">${escapeHtml(iniciales(t.agente.nombre))}</span>
      <span>Tasada por <strong>${escapeHtml(t.agente.nombre)}</strong> el ${escapeHtml(fmtFechaCorta(t.creadaEn))}</span>
    </div>`;
}

let abierta = null;

function abrirDetalle(id) {
  const t = estado.propiedades.find((x) => x.id === id);
  if (!t) return;
  abierta = t;
  $('detTitulo').textContent = titulo(t);
  $('detCuerpo').innerHTML = detalle(t);
  $('detCuerpo').scrollTop = 0;
  const dlg = $('dlgPropiedad');
  if (!dlg.open) dlg.showModal();
  history.replaceState(null, '', `?propiedad=${encodeURIComponent(id)}${location.hash}`);
}

function cerrarDetalle() {
  $('dlgPropiedad').close();
}

/** Link directo a una propiedad: /?propiedad=<id> */
function abrirDesdeUrl() {
  const id = new URLSearchParams(location.search).get('propiedad');
  if (id) abrirDetalle(id);
}

// ---------- Contacto ----------
function renderContacto() {
  const c = sitio.contacto;
  const icono = (d) =>
    `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const items = [
    c.telefono && `<li>${icono('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>')}<a href="tel:${escapeHtml(c.telefono.replace(/[^\d+]/g, ''))}">${escapeHtml(c.telefono)}</a></li>`,
    c.whatsapp && `<li>${icono('<path d="M21 11.5a8.4 8.4 0 0 1-12.5 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/>')}<a href="https://wa.me/${escapeHtml(c.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp</a></li>`,
    c.email && `<li>${icono('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>')}<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a></li>`,
    c.direccion && `<li>${icono('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>')}${escapeHtml(c.direccion)}</li>`,
    c.horario && `<li>${icono('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')}${escapeHtml(c.horario)}</li>`,
  ].filter(Boolean);
  $('contactoDatos').innerHTML = items.join('');
  $('contactoDatos').hidden = !items.length;
}

function consultarPor(t) {
  estado.consultaPor = t;
  $('consultaPropiedad').hidden = !t;
  $('consultaPropiedadTitulo').textContent = t ? `${titulo(t)}${t.propiedad.direccion ? ` · ${t.propiedad.direccion}` : ''}` : '';
  const mensaje = $('cMensaje');
  if (t && !mensaje.value.trim()) {
    const texto = titulo(t); // "Departamento en Palermo" → "departamento en Palermo"
    mensaje.value = `Hola, quiero más información sobre ${texto.charAt(0).toLowerCase()}${texto.slice(1)}.`;
  }
}

async function enviarConsulta(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const error = $('consultaError');
  const datos = Object.fromEntries(new FormData(form));
  error.hidden = true;

  const falta =
    !datos.nombre.trim() ? 'Ingresá tu nombre.'
    : !datos.email.trim() && !datos.telefono.trim() ? 'Dejanos un email o un teléfono para contactarte.'
    : !datos.mensaje.trim() ? 'Escribí tu consulta.'
    : '';
  if (falta) {
    error.textContent = falta;
    error.hidden = false;
    return;
  }

  const boton = $('btnEnviar');
  boton.disabled = true;
  try {
    await api.enviarConsulta({ ...datos, tasacionId: estado.consultaPor?.id });
    form.innerHTML = `
      <div class="consulta-enviada">
        <h3>¡Gracias, ${escapeHtml(datos.nombre.trim().split(/\s+/)[0])}!</h3>
        <p>Recibimos tu consulta. Un agente se va a comunicar con vos a la brevedad.</p>
      </div>`;
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    boton.disabled = false;
  }
}

// ---------- Inicio ----------
function iniciar() {
  const nombre = appConfig.nombreInmobiliaria;
  document.title = `${nombre} · Propiedades`;
  document.querySelectorAll('[data-app="nombre"]').forEach((el) => (el.textContent = nombre));
  document.querySelector('[data-sitio="heroTitulo"]').textContent = sitio.hero.titulo;
  document.querySelector('[data-sitio="heroBajada"]').textContent = sitio.hero.bajada;
  document.querySelector('[data-sitio="historiaTitulo"]').textContent = sitio.historia.titulo;
  document.querySelector('[data-sitio="historiaTexto"]').innerHTML = sitio.historia.parrafos
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
  $('anio').textContent = new Date().getFullYear();
  renderContacto();

  // Atajo de vuelta a la app para quien ya tiene sesión
  const sesion = obtenerSesion();
  if (sesion) {
    $('btnAcceso').href = sesion.usuario.rol === 'admin' ? '/panel.html' : TASADOR;
    $('btnAccesoTexto').textContent = 'Ir a la app';
  }

  $('tarjetas').addEventListener('click', (e) => {
    const t = e.target.closest('.tarjeta');
    if (t) abrirDetalle(t.dataset.id);
  });

  document.querySelectorAll('input[name="filtroUbicacion"]').forEach((r) =>
    r.addEventListener('change', () => {
      estado.ubicacion = r.value;
      renderTarjetas();
    }),
  );
  $('buscar').addEventListener('input', (e) => {
    estado.busqueda = e.target.value;
    renderTarjetas();
  });

  const dlg = $('dlgPropiedad');
  dlg.querySelector('[data-cerrar]').addEventListener('click', cerrarDetalle);
  dlg.addEventListener('click', (e) => e.target === dlg && cerrarDetalle());
  dlg.addEventListener('close', () => history.replaceState(null, '', location.pathname + location.hash));
  $('detConsultar').addEventListener('click', () => {
    consultarPor(abierta);
    cerrarDetalle();
    $('contacto').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => $('cNombre').focus({ preventScroll: true }), 400);
  });

  $('consultaQuitar').addEventListener('click', () => consultarPor(null));
  $('formConsulta').addEventListener('submit', enviarConsulta);

  cargarPropiedades();
}

iniciar();

// Los toasts se usan en otras páginas; acá solo para errores inesperados
window.addEventListener('unhandledrejection', () => toast('Algo salió mal. Probá de nuevo.', 'error'));
