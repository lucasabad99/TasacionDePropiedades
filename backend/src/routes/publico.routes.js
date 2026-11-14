import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { limitarIntentos } from '../middleware/limitarIntentos.js';

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const estaPublicada = (t) => t.publicada !== false;

/**
 * Lo que se muestra de una tasación en la página pública.
 * NUNCA incluye el cliente / propietario (dato personal) ni ids internos del agente.
 */
export function aPublica(t) {
  const p = t.propiedad ?? {};
  return {
    id: t.id,
    creadaEn: t.creadaEn,
    agente: { nombre: t.agente?.nombre ?? 'Inmobiliaria' },
    propiedad: {
      direccion: p.direccion ?? '',
      tipo: p.tipo ?? '',
      jurisdiccion: p.jurisdiccion ?? '',
      zona: p.zona === 'otro' ? '' : (p.zona ?? ''),
      ambientes: p.ambientes ?? null,
      aEstrenar: Boolean(p.aEstrenar),
      observaciones: p.observaciones ?? '',
      referencia: p.referencia ?? null,
    },
    datos: t.datos,
    resultado: t.resultado,
    fotos: (t.fotos ?? []).map((id) => ({ id, url: `/api/fotos/${id}` })),
  };
}

/** Página pública: propiedades publicadas y formulario de contacto. Sin sesión. */
export function crearPublicoRouter({ tasaciones, consultas }) {
  const router = Router();

  router.get('/tasaciones', async (_req, res) => {
    const lista = await tasaciones.listar();
    // Sin caché: si un agente oculta o borra una propiedad, desaparece al instante
    res.set('Cache-Control', 'no-store');
    res.json(lista.filter(estaPublicada).map(aPublica));
  });

  router.get('/tasaciones/:id', async (req, res) => {
    const t = await tasaciones.obtener(req.params.id);
    if (!t || !estaPublicada(t)) return res.status(404).json({ error: 'Propiedad no encontrada.' });
    res.json(aPublica(t));
  });

  // Hasta 5 consultas cada 10 minutos por IP
  router.post('/consultas', limitarIntentos({ max: 5, ventanaMs: 10 * 60_000 }), async (req, res) => {
    const b = req.body ?? {};

    // Campo trampa: invisible para personas, los bots lo completan. Se responde OK sin guardar.
    if (texto(b.sitioWeb, 200)) return res.status(201).json({ ok: true });

    const consulta = {
      nombre: texto(b.nombre, 120),
      email: texto(b.email, 160),
      telefono: texto(b.telefono, 40),
      mensaje: texto(b.mensaje, 2000),
    };

    if (!consulta.nombre) return res.status(422).json({ error: 'Ingresá tu nombre.' });
    if (!consulta.email && !consulta.telefono) {
      return res.status(422).json({ error: 'Dejanos un email o un teléfono para contactarte.' });
    }
    if (consulta.email && !EMAIL.test(consulta.email)) return res.status(422).json({ error: 'El email no es válido.' });
    if (!consulta.mensaje) return res.status(422).json({ error: 'Escribí tu consulta.' });

    // Consulta sobre una propiedad publicada: se guarda a qué propiedad y agente corresponde
    let tasacion = null;
    if (b.tasacionId) {
      const t = await tasaciones.obtener(texto(b.tasacionId, 64));
      if (t && estaPublicada(t)) {
        const p = t.propiedad ?? {};
        tasacion = {
          id: t.id,
          titulo: [p.tipo, p.direccion || p.zona].filter(Boolean).join(' · ') || 'Propiedad',
          agente: t.agente ?? null,
        };
      }
    }

    await consultas.crear({ id: randomUUID(), creadaEn: new Date().toISOString(), ...consulta, tasacion });
    res.status(201).json({ ok: true });
  });

  return router;
}
