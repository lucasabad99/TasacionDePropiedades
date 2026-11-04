import { randomUUID } from 'node:crypto';
import { calcularTasacion } from '@tasador/shared';
import { hashPassword } from '../lib/password.js';

/**
 * Usuarios iniciales. Se crean solo si todavía no hay ningún usuario.
 * ⚠️ Son contraseñas de prueba: en producción, crear usuarios reales con
 *    `npm run usuario:crear` y apagar DEMO_MODE.
 */
export const USUARIOS_DEMO = Object.freeze([
  { usuario: 'admin', password: 'admin123', nombre: 'Administración', rol: 'admin' },
  { usuario: 'mlopez', password: 'agente123', nombre: 'María López', rol: 'agente' },
  { usuario: 'jperez', password: 'agente123', nombre: 'Juan Pérez', rol: 'agente' },
]);

/** Tasaciones de ejemplo para que el panel no arranque vacío (solo con DEMO_MODE). */
const TASACIONES_DEMO = [
  {
    agente: 'mlopez', diasAtras: 1,
    propiedad: { direccion: 'Av. Santa Fe 2450, 3° A', tipo: 'Departamento', cliente: 'Laura Gómez' },
    datos: { supCubierta: 68, supDescubierta: 6, precioBaseM2: 2300, estado: 'bueno', disposicion: 'frente', margenNegociacion: 5 },
  },
  {
    agente: 'mlopez', diasAtras: 4,
    propiedad: { direccion: 'Gorriti 5120', tipo: 'PH', cliente: 'Martín Ruiz' },
    datos: { supCubierta: 95, supDescubierta: 30, precioBaseM2: 2100, estado: 'regular', disposicion: 'interno', margenNegociacion: 7 },
  },
  {
    agente: 'mlopez', diasAtras: 12,
    propiedad: { direccion: 'Av. Cabildo 1890, PB', tipo: 'Consultorio', cliente: 'Centro Médico Norte' },
    datos: {
      supCubierta: 140, supDescubierta: 0, precioBaseM2: 1900, estado: 'excelente', disposicion: 'frente', margenNegociacion: 5,
      incluyeLlave: true, cantConsultorios: 5, canonModulo: 450, ocupacionPct: 80, gastosFijos: 400, multiploEbitda: 2.5,
    },
  },
  {
    agente: 'jperez', diasAtras: 2,
    propiedad: { direccion: 'Thames 1530, 7° C', tipo: 'Departamento', cliente: 'Sofía Benítez' },
    datos: { supCubierta: 52, supDescubierta: 4, precioBaseM2: 2600, estado: 'excelente', disposicion: 'contrafrente', margenNegociacion: 4 },
  },
  {
    agente: 'jperez', diasAtras: 9,
    propiedad: { direccion: 'Av. Rivadavia 6800', tipo: 'Local comercial', cliente: 'Ferretería Flores' },
    datos: { supCubierta: 110, supDescubierta: 20, precioBaseM2: 1600, estado: 'bueno', disposicion: 'frente', margenNegociacion: 6 },
  },
  {
    agente: 'jperez', diasAtras: 20,
    propiedad: { direccion: 'Echeverría 3300', tipo: 'Casa', cliente: 'Familia Torres' },
    datos: { supCubierta: 180, supDescubierta: 120, precioBaseM2: 1700, estado: 'a-refaccionar', disposicion: 'frente', margenNegociacion: 8 },
  },
  {
    agente: 'admin', diasAtras: 6,
    propiedad: { direccion: 'Av. Corrientes 1234, 5° B', tipo: 'Consultorio', cliente: 'Dr. Ramírez' },
    datos: {
      supCubierta: 120, supDescubierta: 15, precioBaseM2: 1800, estado: 'bueno', disposicion: 'frente', margenNegociacion: 5,
      incluyeLlave: true, cantConsultorios: 4, canonModulo: 400, ocupacionPct: 75, gastosFijos: 350, multiploEbitda: 2,
    },
  },
];

export async function sembrarDatos({ usuarios, tasaciones, demoMode }) {
  if ((await usuarios.listar()).length === 0) {
    for (const u of USUARIOS_DEMO) {
      await usuarios.crear({ ...u, passwordHash: await hashPassword(u.password) });
    }
    console.warn(`[seed] Usuarios iniciales creados: ${USUARIOS_DEMO.map((u) => u.usuario).join(', ')}`);
    if (!demoMode) console.warn('[seed] ⚠️  Tienen contraseñas de prueba: reemplazalos por usuarios reales.');
  }

  if (demoMode && (await tasaciones.listar()).length === 0) {
    const porUsuario = new Map((await usuarios.listar()).map((u) => [u.usuario, u]));
    const lista = TASACIONES_DEMO.filter((t) => porUsuario.has(t.agente)).map((t) => {
      const agente = porUsuario.get(t.agente);
      const { datos, ...resultado } = calcularTasacion(t.datos);
      return {
        id: randomUUID(),
        creadaEn: new Date(Date.now() - t.diasAtras * 86_400_000).toISOString(),
        agente: { id: agente.id, nombre: agente.nombre },
        propiedad: { observaciones: '', ...t.propiedad },
        datos,
        resultado,
        demo: true,
      };
    });
    await tasaciones.crearVarias(lista);
    console.warn(`[seed] ${lista.length} tasaciones de ejemplo cargadas (DEMO_MODE).`);
  }
}
