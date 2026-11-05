import { env } from '../config/env.js';
import { crearRepositorioTasaciones } from './tasaciones.repository.js';
import { crearRepositorioUsuarios } from './usuarios.repository.js';

/**
 * Elige dónde se guardan los datos:
 *  - Con MONGODB_URI → MongoDB (staging / producción).
 *  - Sin MONGODB_URI → archivos JSON en DATA_DIR (desarrollo local).
 */
export async function crearRepositorios() {
  if (env.mongodbUri) {
    const { crearRepositoriosMongo } = await import('./mongo.js');
    const repos = await crearRepositoriosMongo(env.mongodbUri, env.mongodbDb);
    return { ...repos, descripcion: `MongoDB (base "${env.mongodbDb}")` };
  }

  return {
    usuarios: crearRepositorioUsuarios(env.dataDir),
    tasaciones: crearRepositorioTasaciones(env.dataDir),
    cerrar: async () => {},
    descripcion: `archivos JSON en ${env.dataDir}`,
  };
}
