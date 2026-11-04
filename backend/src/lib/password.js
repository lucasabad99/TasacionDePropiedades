import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const LARGO = 64;

/** Hashea una contraseña con scrypt + salt aleatorio. Formato: scrypt$salt$hash */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, LARGO);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

export async function verificarPassword(password, guardado) {
  const [algoritmo, salt, hashHex] = String(guardado ?? '').split('$');
  if (algoritmo !== 'scrypt' || !salt || !hashHex) return false;

  const esperado = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, salt, esperado.length);
  return timingSafeEqual(esperado, actual);
}
