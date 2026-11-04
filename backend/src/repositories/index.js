import { env } from '../config/env.js';
import { crearRepositorioTasaciones } from './tasaciones.repository.js';
import { crearRepositorioUsuarios } from './usuarios.repository.js';

/**
 * Elige dónde se guardan los datos:
 *  - Con DATABASE_URL → PostgreSQL (staging / producción).
 *  - Sin DATABASE_URL → archivos JSON en DATA_DIR (desarrollo local).
 */
export async function crearRepositorios() {
  if (env.databaseUrl) {
    const { crearRepositoriosPostgres } = await import('./postgres.js');
    const repos = await crearRepositoriosPostgres(env.databaseUrl);
    return { ...repos, descripcion: 'PostgreSQL' };
  }

  return {
    usuarios: crearRepositorioUsuarios(env.dataDir),
    tasaciones: crearRepositorioTasaciones(env.dataDir),
    cerrar: async () => {},
    descripcion: `archivos JSON en ${env.dataDir}`,
  };
}
