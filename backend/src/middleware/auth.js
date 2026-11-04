import { verificarToken } from '../lib/token.js';
import { aPublico } from '../repositories/usuarios.repository.js';

const NO_AUTENTICADO = { error: 'Tu sesión venció o no es válida. Volvé a ingresar.' };

export function crearAuth({ usuarios, secreto }) {
  /** Exige un token válido. Deja el usuario en req.usuario. */
  async function requerirSesion(req, res, next) {
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token && verificarToken(token, secreto);
    if (!payload) return res.status(401).json(NO_AUTENTICADO);

    // Se relee el usuario en cada pedido: si lo desactivan, pierde acceso al instante.
    const usuario = await usuarios.obtener(payload.sub);
    if (!usuario?.activo) return res.status(401).json(NO_AUTENTICADO);

    req.usuario = aPublico(usuario);
    next();
  }

  /** Exige uno de los roles indicados (usar después de requerirSesion). */
  const requerirRol =
    (...roles) =>
    (req, res, next) =>
      roles.includes(req.usuario?.rol)
        ? next()
        : res.status(403).json({ error: 'No tenés permiso para acceder a esta sección.' });

  return { requerirSesion, requerirRol };
}
