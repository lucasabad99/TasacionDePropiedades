import '../lib/pwa.js';
import '../styles/app.css';
import '../styles/login.css';

import { appConfig } from '../config/app.js';
import { escapeHtml } from '../lib/format.js';
import { api } from '../services/api.js';
import { destinoTrasLogin, guardarSesion, obtenerSesion } from '../services/sesion.js';

const params = new URLSearchParams(location.search);
const form = document.getElementById('formLogin');
const errorEl = document.getElementById('error');
const btn = document.getElementById('btnIngresar');

const ROL_LABEL = { admin: 'Administrador', agente: 'Agente' };

function mostrarError(mensaje) {
  errorEl.textContent = mensaje;
  errorEl.hidden = !mensaje;
}

async function ingresar(e) {
  e.preventDefault();
  const usuario = form.elements.usuario.value.trim();
  const password = form.elements.password.value;
  if (!usuario || !password) {
    mostrarError('Completá usuario y contraseña.');
    (usuario ? form.elements.password : form.elements.usuario).focus();
    return;
  }

  mostrarError('');
  btn.disabled = true;
  btn.textContent = 'Ingresando…';
  try {
    const sesion = await api.login(usuario, password);
    guardarSesion(sesion);
    location.replace(destinoTrasLogin(sesion.usuario, params.get('volver')));
  } catch (err) {
    mostrarError(err.message);
    form.elements.password.select();
    btn.disabled = false;
    btn.textContent = 'Ingresar';
  }
}

function iniciarVerPassword() {
  const boton = document.getElementById('verPassword');
  const input = form.elements.password;
  boton.addEventListener('click', () => {
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    boton.setAttribute('aria-pressed', String(!visible));
    boton.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });
}

/** Cuadro con usuarios y contraseñas de prueba (solo si el backend está en DEMO_MODE). */
async function cargarAccesosDemo() {
  try {
    const accesos = await api.accesosDemo();
    if (!accesos?.length) return;

    const filas = document.getElementById('demoFilas');
    filas.innerHTML = accesos
      .map(
        (a) => `
        <button type="button" class="demo-fila" role="listitem" data-usuario="${escapeHtml(a.usuario)}" data-password="${escapeHtml(a.password)}">
          <span><strong>${escapeHtml(a.usuario)}</strong><small>${escapeHtml(a.nombre)}</small></span>
          <span><code>${escapeHtml(a.password)}</code></span>
          <span><span class="rol-badge rol-${escapeHtml(a.rol)}">${ROL_LABEL[a.rol] ?? escapeHtml(a.rol)}</span></span>
        </button>`,
      )
      .join('');

    filas.addEventListener('click', (e) => {
      const fila = e.target.closest('.demo-fila');
      if (!fila) return;
      form.elements.usuario.value = fila.dataset.usuario;
      form.elements.password.value = fila.dataset.password;
      mostrarError('');
      btn.focus();
    });

    document.getElementById('demoBox').hidden = false;
  } catch {
    /* sin servidor o sin modo demo: no se muestra el cuadro */
  }
}

function iniciar() {
  // Si ya hay sesión, no tiene sentido mostrar el login
  const sesion = obtenerSesion();
  if (sesion) {
    location.replace(destinoTrasLogin(sesion.usuario, params.get('volver')));
    return;
  }

  document.querySelectorAll('[data-app="nombre"]').forEach((el) => (el.textContent = appConfig.nombreInmobiliaria));
  document.title = `Ingresar · ${appConfig.nombreInmobiliaria}`;

  if (params.get('motivo') === 'vencida') {
    const aviso = document.getElementById('aviso');
    aviso.textContent = 'Tu sesión venció. Volvé a ingresar para continuar.';
    aviso.hidden = false;
  }

  form.addEventListener('submit', ingresar);
  form.addEventListener('input', () => mostrarError(''));
  iniciarVerPassword();
  cargarAccesosDemo();
  form.elements.usuario.focus();
}

iniciar();
