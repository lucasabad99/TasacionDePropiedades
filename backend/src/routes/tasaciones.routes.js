import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { calcularTasacion, validarDatos } from '@tasador/shared';

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Datos descriptivos de la propiedad (no intervienen en el cálculo). */
function limpiarPropiedad(p = {}) {
  return {
    direccion: texto(p.direccion, 200),
    tipo: texto(p.tipo, 60),
    cliente: texto(p.cliente, 120),
    observaciones: texto(p.observaciones, 2000),
  };
}

/** El admin accede a todo; el agente solo a lo suyo. */
const puedeVer = (usuario, tasacion) => usuario.rol === 'admin' || tasacion.agente?.id === usuario.id;

/** Requiere que el router se monte detrás de requerirSesion (usa req.usuario). */
export function crearTasacionesRouter(repo) {
  const router = Router();

  router.get('/', async (req, res) => {
    const { usuario } = req;
    const agenteId = usuario.rol === 'admin' ? texto(req.query.agenteId, 64) || undefined : usuario.id;
    res.json(await repo.listar({ agenteId }));
  });

  router.get('/:id', async (req, res) => {
    const tasacion = await repo.obtener(req.params.id);
    if (!tasacion || !puedeVer(req.usuario, tasacion)) {
      return res.status(404).json({ error: 'Tasación no encontrada.' });
    }
    res.json(tasacion);
  });

  router.post('/', async (req, res) => {
    const { datos = {}, propiedad = {} } = req.body ?? {};

    const errores = validarDatos(datos);
    if (errores.length) {
      return res.status(422).json({ error: errores[0].mensaje, errores });
    }

    // El servidor recalcula: nunca confiamos en un total enviado por el cliente.
    const { datos: datosLimpios, ...resultado } = calcularTasacion(datos);

    const tasacion = {
      id: randomUUID(),
      creadaEn: new Date().toISOString(),
      // El agente sale de la sesión, no del formulario: no se puede suplantar.
      agente: { id: req.usuario.id, nombre: req.usuario.nombre },
      propiedad: limpiarPropiedad(propiedad),
      datos: datosLimpios,
      resultado,
    };

    res.status(201).json(await repo.crear(tasacion));
  });

  router.delete('/:id', async (req, res) => {
    const tasacion = await repo.obtener(req.params.id);
    if (!tasacion || !puedeVer(req.usuario, tasacion)) {
      return res.status(404).json({ error: 'Tasación no encontrada.' });
    }
    await repo.eliminar(tasacion.id);
    res.status(204).end();
  });

  return router;
}
