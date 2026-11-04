import { Router } from 'express';
import { COEFICIENTES } from '@tasador/shared';

/**
 * Expone los coeficientes de tasación al frontend.
 * A futuro pueden venir de la base de datos para que la inmobiliaria
 * los ajuste desde un panel sin redeployar.
 */
export function crearConfigRouter() {
  const router = Router();
  router.get('/', (_req, res) => res.json(COEFICIENTES));
  return router;
}
