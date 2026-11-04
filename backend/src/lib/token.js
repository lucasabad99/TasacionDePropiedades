import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Token de sesión firmado con HMAC-SHA256 (mismo principio que un JWT, sin dependencias).
 * Formato: base64url(payload).base64url(firma)
 */
const firmar = (cuerpo, secreto) => createHmac('sha256', secreto).update(cuerpo).digest();

export function firmarToken(payload, secreto, horas) {
  const exp = Date.now() + horas * 60 * 60 * 1000;
  const cuerpo = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const firma = firmar(cuerpo, secreto).toString('base64url');
  return { token: `${cuerpo}.${firma}`, exp };
}

/** Devuelve el payload si el token es auténtico y no venció; si no, null. */
export function verificarToken(token, secreto) {
  const [cuerpo, firma] = String(token ?? '').split('.');
  if (!cuerpo || !firma) return null;

  const esperada = firmar(cuerpo, secreto);
  const recibida = Buffer.from(firma, 'base64url');
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;

  try {
    const payload = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
