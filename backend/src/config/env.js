import path from 'node:path';

const nodeEnv = process.env.NODE_ENV || 'development';
const esEntornoReal = ['staging', 'production'].includes(nodeEnv);

const SECRETO_DEV = 'dev-secret-solo-para-desarrollo-local';

/**
 * Configuración leída del entorno (.env).
 * Todo valor tiene un default razonable para desarrollo local.
 */
export const env = Object.freeze({
  nodeEnv,
  esEntornoReal,
  port: Number(process.env.PORT) || 3001,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  /** Si está definida, los datos se guardan en PostgreSQL en vez de archivos JSON. */
  databaseUrl: process.env.DATABASE_URL || '',
  dataDir: path.resolve(process.cwd(), process.env.DATA_DIR || './data'),
  serveFrontend: process.env.SERVE_FRONTEND === 'true',

  /** Clave con la que se firman las sesiones. Obligatoria en staging/producción. */
  authSecret: process.env.AUTH_SECRET || (esEntornoReal ? '' : SECRETO_DEV),
  /** Duración de la sesión en horas. */
  sesionHoras: Number(process.env.SESION_HORAS) || 12,
  /** Muestra los accesos de prueba en el login y carga tasaciones de ejemplo. */
  demoMode: process.env.DEMO_MODE === 'true',
});

export function validarEnv() {
  if (!env.authSecret || env.authSecret.length < 32) {
    throw new Error('AUTH_SECRET es obligatorio en staging/producción y debe tener al menos 32 caracteres.');
  }
}
