import { escapeHtml, iniciales } from '../lib/format.js';
import { cerrarSesion } from '../services/sesion.js';

const ICONOS = {
  panel:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  tasar:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2"/></svg>',
  salir:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
};

const ROL_LABEL = { admin: 'Administrador', agente: 'Agente' };

/**
 * Agrega a la barra superior: acceso al panel/tasador (admin), usuario y "Salir".
 * @param {'tasador'|'admin'} pagina
 */
export function renderTopbar(contenedor, usuario, { pagina }) {
  let enlace = '';
  if (usuario.rol === 'admin') {
    enlace =
      pagina === 'admin'
        ? `<a class="btn btn-on-dark" href="/">${ICONOS.tasar}<span class="btn-label">Tasar</span></a>`
        : `<a class="btn btn-on-dark" href="/admin.html">${ICONOS.panel}<span class="btn-label">Panel</span></a>`;
  }

  contenedor.insertAdjacentHTML(
    'beforeend',
    `${enlace}
    <div class="user-chip" title="${escapeHtml(usuario.nombre)}">
      <span class="avatar" aria-hidden="true">${escapeHtml(iniciales(usuario.nombre))}</span>
      <span class="user-info">
        <strong>${escapeHtml(usuario.nombre)}</strong>
        <small>${ROL_LABEL[usuario.rol] ?? usuario.rol}</small>
      </span>
    </div>
    <button type="button" class="btn btn-on-dark btn-square" data-salir aria-label="Cerrar sesión" title="Cerrar sesión">${ICONOS.salir}</button>`,
  );

  contenedor.querySelector('[data-salir]').addEventListener('click', () => {
    if (confirm('¿Cerrar sesión?')) cerrarSesion();
  });
}
