/**
 * Crea un usuario desde la terminal.
 *
 *   npm run usuario:crear -- --usuario mgarcia --nombre "Marta García" --password "unaClaveSegura" [--rol agente|admin]
 */
import { parseArgs } from 'node:util';
import { hashPassword } from '../src/lib/password.js';
import { crearRepositorios } from '../src/repositories/index.js';
import { ROLES } from '../src/repositories/usuarios.repository.js';

const { values } = parseArgs({
  options: {
    usuario: { type: 'string' },
    nombre: { type: 'string' },
    password: { type: 'string' },
    rol: { type: 'string', default: 'agente' },
  },
});

const { usuario, nombre, password, rol } = values;

if (!usuario || !nombre || !password) {
  console.error('Uso: npm run usuario:crear -- --usuario <usuario> --nombre "<Nombre>" --password <clave> [--rol agente|admin]');
  process.exit(1);
}
if (!ROLES.includes(rol)) {
  console.error(`Rol inválido "${rol}". Opciones: ${ROLES.join(', ')}`);
  process.exit(1);
}
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

const repos = await crearRepositorios();
try {
  const nuevo = await repos.usuarios.crear({ usuario, nombre, rol, passwordHash: await hashPassword(password) });
  console.log(`✔ Usuario "${nuevo.usuario}" (${nuevo.rol}) creado en ${repos.descripcion}`);
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exitCode = 1;
} finally {
  await repos.cerrar();
}
