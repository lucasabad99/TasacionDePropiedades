import { env } from './config/env.js';
import { iniciarApp } from './iniciar.js';

const { app, descripcion } = await iniciarApp();

app.listen(env.port, () => {
  console.log(`[api] Tasador escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
  console.log(`[api] Datos: ${descripcion}`);
  if (env.serveFrontend) console.log('[api] Sirviendo frontend compilado desde frontend/dist');
  if (env.demoMode) console.log('[api] DEMO_MODE activo: el login muestra los accesos de prueba.');
});
