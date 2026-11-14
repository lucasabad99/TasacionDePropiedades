import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { crearAuth } from './middleware/auth.js';
import { manejarErrores, noEncontrado } from './middleware/errores.js';
import { crearAdminRouter } from './routes/admin.routes.js';
import { crearAuthRouter } from './routes/auth.routes.js';
import { crearConfigRouter } from './routes/config.routes.js';
import { crearConsultasRouter } from './routes/consultas.routes.js';
import { crearFotosRouter } from './routes/fotos.routes.js';
import { crearPublicoRouter } from './routes/publico.routes.js';
import { crearTasacionesRouter } from './routes/tasaciones.routes.js';

/**
 * @param {{ usuarios: object, tasaciones: object, fotos: object, consultas: object }} repos
 *   Repositorios (archivo JSON, base de datos, etc.)
 */
export function createApp({ usuarios, tasaciones, fotos, consultas }) {
  const app = express();
  const auth = crearAuth({ usuarios, secreto: env.authSecret });

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // req.ip correcto detrás de un proxy (Render, Railway, Nginx…)
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  // --- API pública ---
  app.get('/api/health', (_req, res) => res.json({ ok: true, entorno: env.nodeEnv }));
  app.use('/api/config', crearConfigRouter());
  app.use('/api/auth', crearAuthRouter({ usuarios, auth }));
  app.use('/api/publico', crearPublicoRouter({ tasaciones, consultas }));
  // GET de fotos es público; subir requiere sesión (lo resuelve el router)
  app.use('/api/fotos', crearFotosRouter({ fotos, auth }));

  // --- API con sesión ---
  app.use('/api/tasaciones', auth.requerirSesion, crearTasacionesRouter({ tasaciones, fotos }));
  app.use('/api/consultas', auth.requerirSesion, crearConsultasRouter({ consultas }));
  app.use('/api/admin', auth.requerirSesion, auth.requerirRol('admin'), crearAdminRouter({ usuarios, tasaciones }));

  app.use('/api', noEncontrado);

  // --- Frontend compilado (staging / producción en un solo servidor) ---
  if (env.serveFrontend) {
    // Se calcula acá y no arriba: en la Netlify Function (empaquetada como CommonJS)
    // import.meta.url viene vacío, y ahí el frontend lo sirve el CDN.
    const FRONTEND_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
    app.use(express.static(FRONTEND_DIST, { extensions: ['html'] }));
    app.get(/.*/, (_req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
  }

  app.use(manejarErrores);
  return app;
}
