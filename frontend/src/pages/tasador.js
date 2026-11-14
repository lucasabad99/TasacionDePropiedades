import '../lib/pwa.js';
import '../styles/app.css';
import '../styles/print.css';

import { COEFICIENTES, VALORES_INICIALES, calcularTasacion, precioReferencia, validarDatos } from '@tasador/shared';
import { appConfig } from '../config/app.js';
import { fmtUSD } from '../lib/format.js';
import { crearBorrador } from '../lib/storage.js';
import { api } from '../services/api.js';
import { requerirSesion } from '../services/sesion.js';
import {
  actualizarZonas,
  cargarFormulario,
  leerFormulario,
  limpiarError,
  marcarErrores,
  renderOpciones,
  sincronizarLlave,
} from '../ui/formulario.js';
import { crearGaleriaFotos } from '../ui/fotos.js';
import { crearHistorial } from '../ui/historial.js';
import { prepararReporte } from '../ui/reporte.js';
import { renderResultados } from '../ui/resultados.js';
import { toast } from '../ui/toast.js';
import { renderTopbar } from '../ui/topbar.js';

const sesion = requerirSesion();

const form = document.getElementById('formTasacion');
const btnGuardar = document.getElementById('btnGuardar');

let coeficientes = COEFICIENTES;
let resultado = null;
let borrador = null;
let galeria = null;
/** Último precio de referencia que se volcó solo al precio base (para saber si el agente lo tocó). */
let referenciaAplicada = null;

const CAMPOS_UBICACION = new Set(['jurisdiccion', 'zona', 'ambientes', 'aEstrenar']);

// ---------- Cálculo ----------
/** Todo lo que se guarda: datos del cálculo, propiedad, fotos y si se publica. */
function valoresCompletos() {
  return { ...leerFormulario(form), fotos: galeria.ids(), publicada: form.elements.publicada.checked };
}

function cargarTodo(valores) {
  cargarFormulario(form, valores);
  galeria.cargar(valores.fotos ?? []);
  form.elements.publicada.checked = valores.publicada !== false;
}

function recalcular() {
  const valores = valoresCompletos();
  resultado = calcularTasacion(valores.datos, coeficientes);
  renderResultados(resultado);
  borrador.guardar(valores);
}

// ---------- Referencia de mercado del m² ----------
function referenciaActual() {
  return precioReferencia(leerFormulario(form).propiedad);
}

/**
 * Muestra la referencia según la ubicación. Con `autocompletar`, la vuelca al
 * precio base si está vacío o si todavía tiene la referencia anterior (no lo
 * pisa si el agente lo cambió a mano).
 */
function actualizarReferencia({ autocompletar = false } = {}) {
  const ref = referenciaActual();
  const caja = document.getElementById('referenciaM2');
  const precio = form.elements.precioBaseM2;

  caja.hidden = !ref;
  if (ref) {
    caja.querySelector('[data-ref="valor"]').textContent = `Referencia de mercado: ${fmtUSD(ref.usdM2)}/m²`;
    caja.querySelector('[data-ref="detalle"]').textContent = ref.detalle;
    const fuente = caja.querySelector('[data-ref="fuente"]');
    fuente.textContent = `Fuente: ${ref.fuente} · ${ref.periodo}`;
    fuente.href = ref.url;
  }

  const precioActual = Number(precio.value);
  const sinTocar = precio.value === '' || precioActual === referenciaAplicada;
  if (autocompletar && ref && sinTocar) {
    precio.value = String(ref.usdM2);
    limpiarError(precio);
  }
  if (ref && Number(precio.value) === ref.usdM2) referenciaAplicada = ref.usdM2;
}

function usarReferencia() {
  const ref = referenciaActual();
  if (!ref) return;
  form.elements.precioBaseM2.value = String(ref.usdM2);
  referenciaAplicada = ref.usdM2;
  limpiarError(form.elements.precioBaseM2);
  recalcular();
}

// ---------- Acciones ----------
async function guardar() {
  if (galeria.subiendo()) {
    toast('Esperá a que terminen de subirse las fotos.', 'error');
    return;
  }
  const { datos, propiedad, fotos, publicada } = valoresCompletos();
  const errores = validarDatos(datos, coeficientes);
  if (errores.length) {
    marcarErrores(form, errores);
    toast(errores[0].mensaje, 'error');
    return;
  }

  btnGuardar.disabled = true;
  try {
    await api.crearTasacion({ datos, propiedad, fotos, publicada });
    toast('Tasación guardada en el historial.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btnGuardar.disabled = false;
  }
}

function nueva() {
  const { propiedad, datos } = leerFormulario(form);
  const hayDatos =
    ['direccion', 'cliente', 'observaciones', 'zona'].some((c) => propiedad[c]) ||
    datos.supCubierta ||
    datos.precioBaseM2 ||
    galeria.ids().length;
  if (hayDatos && !confirm('¿Empezar una tasación nueva? Se borran los datos cargados.')) return;

  cargarTodo({ datos: VALORES_INICIALES, propiedad: {} });
  referenciaAplicada = null;
  actualizarReferencia();
  borrador.borrar();
  recalcular();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  form.elements.direccion.focus({ preventScroll: true });
}

function imprimir() {
  prepararReporte(document.getElementById('reporte'), {
    propiedad: leerFormulario(form).propiedad,
    referencia: referenciaActual(),
    resultado,
    nombreInmobiliaria: appConfig.nombreInmobiliaria,
    tasador: sesion.usuario.nombre,
  });
  window.print();
}

// ---------- Barra de total en celular ----------
function iniciarBarraMovil() {
  const barra = document.getElementById('mobileTotal');
  const panel = document.getElementById('resultados');

  barra.addEventListener('click', () => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  // Se oculta cuando el panel de resultados ya está a la vista
  new IntersectionObserver(([entrada]) => barra.classList.toggle('oculto', entrada.isIntersecting), {
    threshold: 0.15,
  }).observe(panel);
}

// ---------- Coeficientes desde la API ----------
async function sincronizarCoeficientes() {
  try {
    const remotos = await api.obtenerConfig();
    if (JSON.stringify(remotos) === JSON.stringify(coeficientes)) return;
    const valores = valoresCompletos();
    coeficientes = remotos;
    renderOpciones(form, coeficientes);
    cargarTodo(valores);
    actualizarReferencia();
    recalcular();
  } catch {
    // Sin servidor la calculadora sigue funcionando con los coeficientes locales.
  }
}

// ---------- Inicio ----------
function iniciar({ usuario }) {
  document.querySelectorAll('[data-app="nombre"]').forEach((el) => (el.textContent = appConfig.nombreInmobiliaria));
  document.title = `${appConfig.nombreInmobiliaria} · Tasador`;
  renderTopbar(document.getElementById('topbarAcciones'), usuario, { pagina: 'tasador' });

  borrador = crearBorrador(usuario.id);
  galeria = crearGaleriaFotos({
    contenedor: document.getElementById('fotos'),
    input: document.getElementById('inputFotos'),
    contador: document.getElementById('fotosContador'),
    onCambio: recalcular,
  });
  renderOpciones(form, coeficientes);
  cargarTodo(borrador.leer() ?? { datos: VALORES_INICIALES, propiedad: {} });
  actualizarReferencia();
  recalcular();

  form.addEventListener('input', (e) => {
    limpiarError(e.target);
    if (e.target.name === 'incluyeLlave') sincronizarLlave(form);
    if (e.target.name === 'jurisdiccion') actualizarZonas(form, '');
    if (CAMPOS_UBICACION.has(e.target.name)) actualizarReferencia({ autocompletar: true });
    recalcular();
  });
  document.getElementById('btnUsarReferencia').addEventListener('click', usarReferencia);
  form.addEventListener('submit', (e) => e.preventDefault());

  btnGuardar.addEventListener('click', guardar);
  document.getElementById('btnImprimir').addEventListener('click', imprimir);
  document.getElementById('btnNueva').addEventListener('click', nueva);

  const historial = crearHistorial({
    dialog: document.getElementById('dlgHistorial'),
    lista: document.getElementById('listaHistorial'),
    mostrarAgente: usuario.rol === 'admin',
    onCargar: (t) => {
      cargarTodo(t);
      referenciaAplicada = null;
      actualizarReferencia();
      recalcular();
      toast('Tasación cargada.');
    },
  });
  document.getElementById('btnHistorial').addEventListener('click', historial.abrir);

  iniciarBarraMovil();
  sincronizarCoeficientes();
}

if (sesion) iniciar(sesion);
