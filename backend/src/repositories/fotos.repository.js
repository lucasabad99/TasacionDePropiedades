import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { crearStoreJson } from './jsonStore.js';

/**
 * Fotos en disco (desarrollo local): el archivo en DATA_DIR/fotos/<id> y los
 * datos (tipo, tamaño, quién la subió) en fotos.json.
 * Los ids los genera el servidor (UUID), nunca vienen del usuario sin validar.
 */
export function crearRepositorioFotos(dataDir) {
  const carpeta = path.join(dataDir, 'fotos');
  const store = crearStoreJson(path.join(dataDir, 'fotos.json'));
  const archivo = (id) => path.join(carpeta, id);

  const obtenerMeta = async (id) => (await store.leer()).find((f) => f.id === id) ?? null;

  return {
    obtenerMeta,

    async crear({ agenteId, contentType, datos }) {
      const foto = { id: randomUUID(), agenteId, contentType, tamano: datos.length, creadaEn: new Date().toISOString() };
      await mkdir(carpeta, { recursive: true });
      await writeFile(archivo(foto.id), datos);
      return store.modificar((items) => ({ items: [...items, foto], resultado: foto }));
    },

    async obtener(id) {
      const meta = await obtenerMeta(id);
      if (!meta) return null;
      try {
        return { ...meta, datos: await readFile(archivo(id)) };
      } catch {
        return null;
      }
    },

    async eliminar(ids) {
      if (!ids.length) return;
      await store.modificar((items) => ({ items: items.filter((f) => !ids.includes(f.id)) }));
      await Promise.all(ids.map((id) => unlink(archivo(id)).catch(() => {})));
    },
  };
}
