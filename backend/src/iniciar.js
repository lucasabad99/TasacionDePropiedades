import { createApp } from './app.js';
import { env, validarEnv } from './config/env.js';
import { crearRepositorios } from './repositories/index.js';
import { sembrarDatos } from './seed/demo.js';

/**
 * Prepara la app: valida el entorno, conecta los repositorios y carga los
 * datos iniciales. La usan el servidor (server.js) y la Netlify Function.
 */
export async function iniciarApp() {
  validarEnv();

  const repos = await crearRepositorios();
  const { usuarios, tasaciones, descripcion } = repos;

  if (env.esEntornoReal && !env.mongodbUri) {
    console.warn('[api] ⚠️  Sin MONGODB_URI: los datos van a archivos JSON y en un servidor gratis se borran en cada reinicio.');
  }

  await sembrarDatos({ usuarios, tasaciones, demoMode: env.demoMode });

  return { app: createApp(repos), descripcion };
}
