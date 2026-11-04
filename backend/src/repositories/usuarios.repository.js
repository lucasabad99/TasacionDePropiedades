import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { crearStoreJson } from './jsonStore.js';

export const ROLES = Object.freeze(['admin', 'agente']);

/** Datos del usuario que se pueden mostrar (nunca el hash de la contraseña). */
export const aPublico = ({ id, usuario, nombre, rol }) => ({ id, usuario, nombre, rol });

const normalizar = (usuario) => String(usuario ?? '').trim().toLowerCase();

export function crearRepositorioUsuarios(dataDir) {
  const store = crearStoreJson(path.join(dataDir, 'usuarios.json'));

  return {
    listar: () => store.leer(),

    async obtener(id) {
      return (await store.leer()).find((u) => u.id === id) ?? null;
    },

    async buscarPorUsuario(usuario) {
      const buscado = normalizar(usuario);
      return (await store.leer()).find((u) => u.usuario === buscado) ?? null;
    },

    /** @param {{usuario: string, nombre: string, rol: string, passwordHash: string}} datos */
    crear(datos) {
      return store.modificar((items) => {
        const usuario = normalizar(datos.usuario);
        if (items.some((u) => u.usuario === usuario)) {
          throw new Error(`El usuario "${usuario}" ya existe.`);
        }
        const nuevo = {
          id: randomUUID(),
          usuario,
          nombre: datos.nombre.trim(),
          rol: datos.rol,
          passwordHash: datos.passwordHash,
          activo: true,
          creadoEn: new Date().toISOString(),
        };
        return { items: [...items, nuevo], resultado: nuevo };
      });
    },
  };
}
