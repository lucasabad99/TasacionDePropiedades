/**
 * Limita los intentos de login por IP + usuario (en memoria).
 * Frena a quien intente adivinar contraseñas probando muchas seguidas.
 */
export function limitarIntentos({ max = 8, ventanaMs = 60_000 } = {}) {
  const intentos = new Map();

  return (req, res, next) => {
    const ahora = Date.now();
    const clave = `${req.ip}|${String(req.body?.usuario ?? '').trim().toLowerCase()}`;
    const recientes = (intentos.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);

    if (recientes.length >= max) {
      return res.status(429).json({ error: 'Demasiados intentos. Esperá un minuto y probá de nuevo.' });
    }

    recientes.push(ahora);
    intentos.set(clave, recientes);

    // Limpieza para que el mapa no crezca indefinidamente
    if (intentos.size > 5000) {
      for (const [k, v] of intentos) if (v.every((t) => ahora - t >= ventanaMs)) intentos.delete(k);
    }
    next();
  };
}
