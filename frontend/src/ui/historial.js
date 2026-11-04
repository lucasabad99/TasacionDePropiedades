import { escapeHtml, fmtFecha, fmtUSD } from '../lib/format.js';
import { api } from '../services/api.js';
import { toast } from './toast.js';

/**
 * Diálogo con las tasaciones guardadas en el servidor.
 * @param {{dialog: HTMLDialogElement, lista: HTMLElement, onCargar: (t) => void, mostrarAgente?: boolean}} opciones
 */
export function crearHistorial({ dialog, lista, onCargar, mostrarAgente = false }) {
  let items = [];

  const vacio = (texto) => `<p class="estado-vacio">${escapeHtml(texto)}</p>`;

  function render() {
    if (!items.length) {
      lista.innerHTML = vacio('Todavía no hay tasaciones guardadas.');
      return;
    }
    lista.innerHTML = items
      .map((t) => {
        const titulo = t.propiedad.direccion || t.propiedad.tipo || 'Propiedad sin dirección';
        const meta = [mostrarAgente && t.agente?.nombre, t.propiedad.cliente, fmtFecha(t.creadaEn)]
          .filter(Boolean)
          .join(' · ');
        return `
          <div class="historial-item">
            <button type="button" class="historial-cargar" data-accion="cargar" data-id="${escapeHtml(t.id)}">
              <span class="historial-titulo">${escapeHtml(titulo)}</span>
              <span class="historial-meta">${escapeHtml(meta)}</span>
              <span class="historial-total">${fmtUSD(t.resultado.total)}</span>
            </button>
            <button type="button" class="btn btn-danger-ghost" data-accion="eliminar" data-id="${escapeHtml(t.id)}">Eliminar</button>
          </div>`;
      })
      .join('');
  }

  async function abrir() {
    lista.innerHTML = vacio('Cargando…');
    dialog.showModal();
    try {
      items = await api.listarTasaciones();
      render();
    } catch (err) {
      lista.innerHTML = vacio(err.message);
    }
  }

  lista.addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const tasacion = items.find((t) => t.id === boton.dataset.id);
    if (!tasacion) return;

    if (boton.dataset.accion === 'cargar') {
      onCargar(tasacion);
      dialog.close();
      return;
    }

    if (boton.dataset.accion === 'eliminar') {
      if (!confirm('¿Eliminar esta tasación del historial?')) return;
      try {
        await api.eliminarTasacion(tasacion.id);
        items = items.filter((t) => t.id !== tasacion.id);
        render();
        toast('Tasación eliminada.');
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  });

  dialog.querySelector('[data-cerrar]').addEventListener('click', () => dialog.close());
  // Cerrar al tocar fuera del diálogo
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  return { abrir };
}
