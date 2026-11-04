import { createApp } from './app.js';
import { env, validarEnv } from './config/env.js';
import { crearRepositorios } from './repositories/index.js';
import { sembrarDatos } from './seed/demo.js';

validarEnv();

const { usuarios, tasaciones, descripcion } = await crearRepositorios();

if (env.esEntornoReal && !env.databaseUrl) {
  console.warn('[api] ⚠️  Sin DATABASE_URL: los datos van a archivos JSON y en Render se borran en cada reinicio.');
}

await sembrarDatos({ usuarios, tasaciones, demoMode: env.demoMode });

createApp({ usuarios, tasaciones }).listen(env.port, () => {
  console.log(`[api] Tasador escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
  console.log(`[api] Datos: ${descripcion}`);
  if (env.serveFrontend) console.log('[api] Sirviendo frontend compilado desde frontend/dist');
  if (env.demoMode) console.log('[api] DEMO_MODE activo: el login muestra los accesos de prueba.');
});
