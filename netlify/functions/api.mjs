import serverless from 'serverless-http';
import { env } from '../../backend/src/config/env.js';
import { iniciarApp } from '../../backend/src/iniciar.js';

/**
 * API del tasador como Netlify Function.
 *
 * netlify.toml redirige /api/* acá. La app de Express es la misma que corre en
 * local; la conexión a MongoDB se crea una vez y se reutiliza mientras la
 * función siga "caliente".
 */

let listo;

function preparar() {
  if (!env.mongodbUri && process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error('Falta MONGODB_URI en las variables de entorno de Netlify (el disco de las funciones es de solo lectura).');
  }
  return iniciarApp().then(({ app, descripcion }) => {
    console.log(`[api] Netlify Function lista. Datos: ${descripcion}`);
    return serverless(app, {
      // Según cómo llegue la petición, la ruta puede venir como /.netlify/functions/api/...
      request(req) {
        req.url = req.url.replace(/^\/\.netlify\/functions\/api(?=\/|\?|$)/, '/api');

        // Con Express 5, express.json() da la petición por "ya leída" y deja el
        // body crudo (Buffer). Lo parseamos acá.
        if (Buffer.isBuffer(req.body)) {
          const esJson = /application\/json/i.test(req.headers['content-type'] ?? '');
          try {
            req.body = esJson && req.body.length ? JSON.parse(req.body.toString('utf8')) : undefined;
          } catch {
            req.body = undefined; // JSON inválido: las rutas responden 400
          }
        }
      },
    });
  });
}

export async function handler(event, context) {
  // No esperar a que se cierre la conexión a Mongo para responder
  context.callbackWaitsForEmptyEventLoop = false;

  listo ??= preparar().catch((err) => {
    listo = undefined; // reintentar en la próxima petición
    throw err;
  });

  return (await listo)(event, context);
}
