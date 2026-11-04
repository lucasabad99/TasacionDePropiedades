import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Colección guardada en un archivo JSON (un array de objetos).
 *
 * Alcanza para staging y un uso chico. Para escalar se reemplazan los
 * repositorios por versiones con base de datos que tengan la misma interfaz;
 * las rutas no se enteran.
 */
export function crearStoreJson(archivo) {
  let cola = Promise.resolve();

  async function leer() {
    try {
      return JSON.parse(await readFile(archivo, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  async function escribir(items) {
    await mkdir(path.dirname(archivo), { recursive: true });
    const tmp = `${archivo}.tmp`;
    await writeFile(tmp, JSON.stringify(items, null, 2), 'utf8');
    await rename(tmp, archivo); // escritura atómica
  }

  /**
   * Lee, modifica y guarda en serie, para que dos pedidos simultáneos no se pisen.
   * `fn(items)` devuelve `{ items?, resultado }`; si no trae `items`, no se escribe nada.
   */
  function modificar(fn) {
    const operacion = cola.then(async () => {
      const { items, resultado } = await fn(await leer());
      if (items) await escribir(items);
      return resultado;
    });
    cola = operacion.catch(() => {});
    return operacion;
  }

  return { leer, modificar };
}
