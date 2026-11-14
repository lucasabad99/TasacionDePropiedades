import express, { Router } from 'express';

/** Tamaño máximo por foto (ya comprimida en el navegador suele pesar ~300 KB). */
export const MAX_BYTES_FOTO = 5 * 1024 * 1024;

export const ID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tipo real de la imagen según sus primeros bytes (no confiamos en el Content-Type). */
function tipoDeImagen(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

/**
 * Fotos de las tasaciones.
 *  - POST /api/fotos  (con sesión): sube una imagen, devuelve { id, url }.
 *  - GET  /api/fotos/:id (pública): la imagen. El id es un UUID imposible de
 *    adivinar, así que las fotos se pueden mostrar con un <img> común.
 */
export function crearFotosRouter({ fotos, auth }) {
  const router = Router();

  router.post(
    '/',
    auth.requerirSesion,
    express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MAX_BYTES_FOTO }),
    async (req, res) => {
      const datos = req.body;
      if (!Buffer.isBuffer(datos) || datos.length === 0) {
        return res.status(400).json({ error: 'Mandá una imagen JPG, PNG o WebP.' });
      }
      if (datos.length > MAX_BYTES_FOTO) {
        return res.status(413).json({ error: 'La foto es demasiado grande (máximo 5 MB).' });
      }
      const contentType = tipoDeImagen(datos);
      if (!contentType) return res.status(415).json({ error: 'El archivo no es una imagen JPG, PNG o WebP.' });

      const foto = await fotos.crear({ agenteId: req.usuario.id, contentType, datos });
      res.status(201).json({ id: foto.id, url: `/api/fotos/${foto.id}` });
    },
  );

  router.get('/:id', async (req, res) => {
    const foto = ID_VALIDO.test(req.params.id) ? await fotos.obtener(req.params.id) : null;
    if (!foto) return res.status(404).json({ error: 'Foto no encontrada.' });

    res
      .set('Content-Type', foto.contentType)
      .set('Cache-Control', 'public, max-age=31536000, immutable') // una foto nunca cambia de contenido
      .set('X-Content-Type-Options', 'nosniff')
      .send(foto.datos);
  });

  return router;
}
