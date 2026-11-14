import { appConfig } from '../config/app.js';
import { escapeHtml } from '../lib/format.js';
import { api } from '../services/api.js';
import { toast } from './toast.js';

export const MAX_FOTOS = 12;
const LADO_MAX = 1600; // px del lado más largo
const CALIDAD = 0.82;

export const urlFoto = (id) => `${appConfig.apiUrl}/api/fotos/${encodeURIComponent(id)}`;

/**
 * Achica la foto en el navegador antes de subirla (una foto de celular de
 * 4-8 MB queda en ~300 KB). Respeta la orientación de la cámara.
 */
async function comprimir(archivo) {
  let imagen;
  try {
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`"${archivo.name}" no es una imagen que se pueda leer.`);
  }
  const escala = Math.min(1, LADO_MAX / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(imagen.width * escala);
  canvas.height = Math.round(imagen.height * escala);
  canvas.getContext('2d').drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close?.();

  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', CALIDAD));
  if (!blob) throw new Error(`No se pudo procesar "${archivo.name}".`);
  return blob;
}

const ICONO_QUITAR =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

/**
 * Galería de fotos de la tasación (opcional).
 * Cada foto se sube apenas se elige; la tasación guarda solo los ids.
 */
export function crearGaleriaFotos({ contenedor, input, contador, onCambio }) {
  /** @type {{ id?: string, previa: string, subiendo: boolean }[]} */
  let fotos = [];

  function render() {
    contenedor.innerHTML = fotos
      .map(
        (f, i) => `
        <figure class="foto ${f.subiendo ? 'subiendo' : ''}">
          <img src="${escapeHtml(f.previa)}" alt="Foto ${i + 1}" loading="lazy" />
          ${
            f.subiendo
              ? '<span class="foto-estado">Subiendo…</span>'
              : `<button type="button" class="foto-quitar" data-quitar="${i}" aria-label="Quitar foto ${i + 1}">${ICONO_QUITAR}</button>`
          }
        </figure>`,
      )
      .join('');
    contador.textContent = fotos.length ? `${fotos.length} de ${MAX_FOTOS}` : `Opcional · hasta ${MAX_FOTOS}`;
    input.disabled = fotos.length >= MAX_FOTOS;
  }

  async function agregar(archivos) {
    const lugar = MAX_FOTOS - fotos.length;
    if (archivos.length > lugar) toast(`Se agregan ${lugar} de ${archivos.length}: el máximo es ${MAX_FOTOS} fotos.`, 'error');

    await Promise.all(
      archivos.slice(0, Math.max(lugar, 0)).map(async (archivo) => {
        const foto = { previa: URL.createObjectURL(archivo), subiendo: true };
        fotos.push(foto);
        render();
        try {
          const { id } = await api.subirFoto(await comprimir(archivo));
          URL.revokeObjectURL(foto.previa);
          Object.assign(foto, { id, previa: urlFoto(id), subiendo: false });
        } catch (err) {
          URL.revokeObjectURL(foto.previa);
          fotos = fotos.filter((f) => f !== foto);
          toast(err.message || 'No se pudo subir la foto.', 'error');
        }
        render();
        onCambio();
      }),
    );
  }

  input.addEventListener('change', () => {
    const archivos = [...input.files];
    input.value = ''; // permite volver a elegir la misma foto
    if (archivos.length) agregar(archivos);
  });

  contenedor.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-quitar]');
    if (!boton) return;
    fotos.splice(Number(boton.dataset.quitar), 1);
    render();
    onCambio();
  });

  render();

  return {
    /** Ids de las fotos ya subidas. */
    ids: () => fotos.filter((f) => f.id).map((f) => f.id),
    subiendo: () => fotos.some((f) => f.subiendo),
    cargar(ids = []) {
      fotos = ids.map((id) => ({ id, previa: urlFoto(id), subiendo: false }));
      render();
    },
  };
}
