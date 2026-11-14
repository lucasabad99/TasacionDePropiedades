import path from 'node:path';
import { crearStoreJson } from './jsonStore.js';

const masRecientePrimero = (a, b) => b.creadaEn.localeCompare(a.creadaEn);

export function crearRepositorioTasaciones(dataDir) {
  const store = crearStoreJson(path.join(dataDir, 'tasaciones.json'));

  return {
    /** @param {{agenteId?: string}} filtros */
    async listar({ agenteId } = {}) {
      let items = await store.leer();
      if (agenteId) items = items.filter((t) => t.agente?.id === agenteId);
      return items.sort(masRecientePrimero);
    },

    async obtener(id) {
      return (await store.leer()).find((t) => t.id === id) ?? null;
    },

    crear(tasacion) {
      return store.modificar((items) => ({ items: [...items, tasacion], resultado: tasacion }));
    },

    /** Cambia campos sueltos (ej. publicada). Devuelve la tasación actualizada o null. */
    actualizar(id, cambios) {
      return store.modificar((items) => {
        const i = items.findIndex((t) => t.id === id);
        if (i === -1) return { resultado: null };
        const copia = [...items];
        copia[i] = { ...items[i], ...cambios };
        return { items: copia, resultado: copia[i] };
      });
    },

    crearVarias(lista) {
      return store.modificar((items) => ({ items: [...items, ...lista], resultado: lista.length }));
    },

    eliminar(id) {
      return store.modificar((items) => {
        const restantes = items.filter((t) => t.id !== id);
        return restantes.length === items.length
          ? { resultado: false }
          : { items: restantes, resultado: true };
      });
    },
  };
}
