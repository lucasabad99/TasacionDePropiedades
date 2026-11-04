import { Router } from 'express';
import { env } from '../config/env.js';
import { verificarPassword } from '../lib/password.js';
import { firmarToken } from '../lib/token.js';
import { limitarIntentos } from '../middleware/limitarIntentos.js';
import { aPublico } from '../repositories/usuarios.repository.js';
import { USUARIOS_DEMO } from '../seed/demo.js';

export function crearAuthRouter({ usuarios, auth }) {
  const router = Router();

  router.post('/login', limitarIntentos(), async (req, res) => {
    const { usuario, password } = req.body ?? {};
    if (typeof usuario !== 'string' || typeof password !== 'string' || !usuario.trim() || !password) {
      return res.status(400).json({ error: 'Ingresá usuario y contraseña.' });
    }

    const encontrado = await usuarios.buscarPorUsuario(usuario);
    const valido = encontrado?.activo && (await verificarPassword(password, encontrado.passwordHash));
    if (!valido) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });

    const { token, exp } = firmarToken({ sub: encontrado.id }, env.authSecret, env.sesionHoras);
    res.json({ token, expiraEn: exp, usuario: aPublico(encontrado) });
  });

  router.get('/me', auth.requerirSesion, (req, res) => {
    res.json({ usuario: req.usuario });
  });

  /** Accesos de prueba para el cuadro del login. Vacío si DEMO_MODE está apagado. */
  router.get('/demo', (_req, res) => {
    res.json(env.demoMode ? USUARIOS_DEMO.map(({ usuario, password, nombre, rol }) => ({ usuario, password, nombre, rol })) : []);
  });

  return router;
}
