import { Router } from 'express';

/**
 * Consultas recibidas desde la página pública (requiere sesión).
 *  - Admin: todas.
 *  - Agente: las que preguntan por propiedades que cargó él.
 */
export function crearConsultasRouter({ consultas }) {
  const router = Router();

  const puedeVer = (usuario, c) => usuario.rol === 'admin' || c.tasacion?.agente?.id === usuario.id;

  router.get('/', async (req, res) => {
    const lista = await consultas.listar();
    res.json(lista.filter((c) => puedeVer(req.usuario, c)));
  });

  router.delete('/:id', async (req, res) => {
    const c = (await consultas.listar()).find((x) => x.id === req.params.id);
    if (!c || !puedeVer(req.usuario, c)) return res.status(404).json({ error: 'Consulta no encontrada.' });
    await consultas.eliminar(c.id);
    res.status(204).end();
  });

  return router;
}
