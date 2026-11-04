import { Router } from 'express';
import { aPublico } from '../repositories/usuarios.repository.js';

const SIN_ASIGNAR = 'sin-asignar';

/** Requiere montarse detrás de requerirSesion + requerirRol('admin'). */
export function crearAdminRouter({ usuarios, tasaciones }) {
  const router = Router();

  /** Resumen por agente: cantidad de tasaciones, valor total tasado y última actividad. */
  router.get('/agentes', async (_req, res) => {
    const [listaUsuarios, listaTasaciones] = await Promise.all([usuarios.listar(), tasaciones.listar()]);

    const stats = new Map();
    for (const t of listaTasaciones) {
      const id = t.agente?.id ?? SIN_ASIGNAR;
      const s = stats.get(id) ?? { cantidad: 0, valorTotal: 0, ultima: null, nombre: t.agente?.nombre };
      s.cantidad += 1;
      s.valorTotal += t.resultado.total;
      if (!s.ultima || t.creadaEn > s.ultima) s.ultima = t.creadaEn;
      stats.set(id, s);
    }

    const vacio = { cantidad: 0, valorTotal: 0, ultima: null };
    const agentes = listaUsuarios.map((u) => {
      const { nombre: _n, ...s } = stats.get(u.id) ?? vacio;
      return { ...aPublico(u), activo: u.activo, ...s };
    });

    // Tasaciones de usuarios que ya no existen (o sin agente, de antes del login)
    const idsUsuarios = new Set(listaUsuarios.map((u) => u.id));
    for (const [id, { nombre, ...s }] of stats) {
      if (idsUsuarios.has(id)) continue;
      agentes.push({
        id,
        usuario: null,
        nombre: id === SIN_ASIGNAR ? 'Sin asignar' : `${nombre ?? 'Usuario'} (eliminado)`,
        rol: null,
        activo: false,
        ...s,
      });
    }

    agentes.sort((a, b) => b.valorTotal - a.valorTotal || a.nombre.localeCompare(b.nombre));
    res.json(agentes);
  });

  return router;
}
