import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { JURISDICCIONES, calcularTasacion, precioReferencia, validarDatos, zonasDe } from '@tasador/shared';
import { ID_VALIDO } from './fotos.routes.js';

export const MAX_FOTOS = 12;

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Datos descriptivos de la propiedad (no intervienen en el cálculo).
 * Guarda una copia de la referencia de mercado vigente: si después se
 * actualizan los precios de referencia, la tasación conserva la que usó.
 */
function limpiarPropiedad(p = {}) {
  const jurisdiccion = JURISDICCIONES.some((j) => j.id === p.jurisdiccion) ? p.jurisdiccion : '';
  const zonaPedida = texto(p.zona, 80);
  const zona = zonasDe(jurisdiccion).includes(zonaPedida) || (jurisdiccion === 'provincia' && zonaPedida === 'otro') ? zonaPedida : '';
  const ambientes = Math.min(Math.max(Math.trunc(Number(p.ambientes)) || 2, 1), 4);
  const aEstrenar = p.aEstrenar === true || p.aEstrenar === 'true';

  return {
    direccion: texto(p.direccion, 200),
    tipo: texto(p.tipo, 60),
    cliente: texto(p.cliente, 120),
    observaciones: texto(p.observaciones, 2000),
    jurisdiccion,
    zona,
    ambientes,
    aEstrenar,
    referencia: precioReferencia({ jurisdiccion, zona, ambientes, aEstrenar }),
  };
}

/**
 * Fotos que se adjuntan a la tasación: ids válidos, sin repetir, hasta MAX_FOTOS,
 * que existan y que haya subido el mismo usuario (o cualquiera, si es admin).
 */
async function validarFotos(ids, usuario, fotos) {
  if (!Array.isArray(ids)) return [];
  const unicos = [...new Set(ids.filter((id) => typeof id === 'string' && ID_VALIDO.test(id)))].slice(0, MAX_FOTOS);
  const metas = await Promise.all(unicos.map((id) => fotos.obtenerMeta(id)));
  return unicos.filter((_, i) => metas[i] && (usuario.rol === 'admin' || metas[i].agenteId === usuario.id));
}

/** El admin accede a todo; el agente solo a lo suyo. */
const puedeVer = (usuario, tasacion) => usuario.rol === 'admin' || tasacion.agente?.id === usuario.id;

/** Requiere que el router se monte detrás de requerirSesion (usa req.usuario). */
export function crearTasacionesRouter({ tasaciones: repo, fotos }) {
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
    const { datos = {}, propiedad = {}, fotos: idsFotos = [], publicada = true } = req.body ?? {};

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
      fotos: await validarFotos(idsFotos, req.usuario, fotos),
      // Se muestra en la página pública salvo que el agente lo desactive
      publicada: publicada !== false,
    };

    res.status(201).json(await repo.crear(tasacion));
  });

  /** Mostrar u ocultar en la página pública. */
  router.patch('/:id', async (req, res) => {
    const tasacion = await repo.obtener(req.params.id);
    if (!tasacion || !puedeVer(req.usuario, tasacion)) {
      return res.status(404).json({ error: 'Tasación no encontrada.' });
    }
    if (typeof req.body?.publicada !== 'boolean') {
      return res.status(422).json({ error: 'Indicá si la tasación se publica (true o false).' });
    }
    res.json(await repo.actualizar(tasacion.id, { publicada: req.body.publicada }));
  });

  router.delete('/:id', async (req, res) => {
    const tasacion = await repo.obtener(req.params.id);
    if (!tasacion || !puedeVer(req.usuario, tasacion)) {
      return res.status(404).json({ error: 'Tasación no encontrada.' });
    }
    await repo.eliminar(tasacion.id);
    await fotos.eliminar(tasacion.fotos ?? []);
    res.status(204).end();
  });

  return router;
}
