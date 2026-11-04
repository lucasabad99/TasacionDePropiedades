import '../lib/pwa.js';
import '../styles/app.css';
import '../styles/print.css';

import { COEFICIENTES, VALORES_INICIALES, calcularTasacion, validarDatos } from '@tasador/shared';
import { appConfig } from '../config/app.js';
import { crearBorrador } from '../lib/storage.js';
import { api } from '../services/api.js';
import { requerirSesion } from '../services/sesion.js';
import {
  cargarFormulario,
  leerFormulario,
  limpiarError,
  marcarErrores,
  renderOpciones,
  sincronizarLlave,
} from '../ui/formulario.js';
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

// ---------- Cálculo ----------
function recalcular() {
  const valores = leerFormulario(form);
  resultado = calcularTasacion(valores.datos, coeficientes);
  renderResultados(resultado);
  borrador.guardar(valores);
}

// ---------- Acciones ----------
async function guardar() {
  const { datos, propiedad } = leerFormulario(form);
  const errores = validarDatos(datos, coeficientes);
  if (errores.length) {
    marcarErrores(form, errores);
    toast(errores[0].mensaje, 'error');
    return;
  }

  btnGuardar.disabled = true;
  try {
    await api.crearTasacion({ datos, propiedad });
    toast('Tasación guardada en el historial.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btnGuardar.disabled = false;
  }
}

function nueva() {
  const { propiedad, datos } = leerFormulario(form);
  const hayDatos = Object.values(propiedad).some(Boolean) || datos.supCubierta || datos.precioBaseM2;
  if (hayDatos && !confirm('¿Empezar una tasación nueva? Se borran los datos cargados.')) return;

  cargarFormulario(form, { datos: VALORES_INICIALES, propiedad: {} });
  borrador.borrar();
  recalcular();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  form.elements.direccion.focus({ preventScroll: true });
}

function imprimir() {
  prepararReporte(document.getElementById('reporte'), {
    propiedad: leerFormulario(form).propiedad,
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
    const valores = leerFormulario(form);
    coeficientes = remotos;
    renderOpciones(form, coeficientes);
    cargarFormulario(form, valores);
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
  renderOpciones(form, coeficientes);
  cargarFormulario(form, borrador.leer() ?? { datos: VALORES_INICIALES, propiedad: {} });
  recalcular();

  form.addEventListener('input', (e) => {
    limpiarError(e.target);
    if (e.target.name === 'incluyeLlave') sincronizarLlave(form);
    recalcular();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  btnGuardar.addEventListener('click', guardar);
  document.getElementById('btnImprimir').addEventListener('click', imprimir);
  document.getElementById('btnNueva').addEventListener('click', nueva);

  const historial = crearHistorial({
    dialog: document.getElementById('dlgHistorial'),
    lista: document.getElementById('listaHistorial'),
    mostrarAgente: usuario.rol === 'admin',
    onCargar: (t) => {
      cargarFormulario(form, t);
      recalcular();
      toast('Tasación cargada.');
    },
  });
  document.getElementById('btnHistorial').addEventListener('click', historial.abrir);

  iniciarBarraMovil();
  sincronizarCoeficientes();
}

if (sesion) iniciar(sesion);
