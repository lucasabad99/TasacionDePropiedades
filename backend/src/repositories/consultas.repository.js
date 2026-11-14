import path from 'node:path';
import { crearStoreJson } from './jsonStore.js';

/** Consultas del formulario "Contáctenos" de la página pública (archivo JSON). */
export function crearRepositorioConsultas(dataDir) {
  const store = crearStoreJson(path.join(dataDir, 'consultas.json'));

  return {
    async listar() {
      return (await store.leer()).sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
    },

    crear(consulta) {
      return store.modificar((items) => ({ items: [...items, consulta], resultado: consulta }));
    },

    eliminar(id) {
      return store.modificar((items) => {
        const restantes = items.filter((c) => c.id !== id);
        return restantes.length === items.length ? { resultado: false } : { items: restantes, resultado: true };
      });
    },
  };
}
