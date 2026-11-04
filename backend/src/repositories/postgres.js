import { randomUUID } from 'node:crypto';
import pg from 'pg';

/**
 * Repositorios sobre PostgreSQL (se usan cuando existe DATABASE_URL).
 *
 * Misma interfaz que los repositorios de archivo JSON: las rutas no se enteran.
 * Cada registro se guarda entero en una columna JSONB (`doc`), con columnas
 * aparte solo para lo que se busca u ordena.
 */

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id         TEXT PRIMARY KEY,
    usuario    TEXT NOT NULL UNIQUE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    doc        JSONB NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasaciones (
    id         TEXT PRIMARY KEY,
    agente_id  TEXT,
    creada_en  TIMESTAMPTZ NOT NULL,
    doc        JSONB NOT NULL
  );

  CREATE INDEX IF NOT EXISTS tasaciones_agente_idx ON tasaciones (agente_id, creada_en DESC);
`;

const normalizar = (usuario) => String(usuario ?? '').trim().toLowerCase();

export async function crearRepositoriosPostgres(databaseUrl) {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    // Los Postgres administrados (Neon, Supabase, Render externo) piden SSL.
    ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? false : { rejectUnauthorized: false },
  });

  await pool.query(ESQUEMA);

  const usuarios = {
    async listar() {
      const { rows } = await pool.query('SELECT doc FROM usuarios ORDER BY creado_en');
      return rows.map((r) => r.doc);
    },

    async obtener(id) {
      const { rows } = await pool.query('SELECT doc FROM usuarios WHERE id = $1', [id]);
      return rows[0]?.doc ?? null;
    },

    async buscarPorUsuario(usuario) {
      const { rows } = await pool.query('SELECT doc FROM usuarios WHERE usuario = $1', [normalizar(usuario)]);
      return rows[0]?.doc ?? null;
    },

    async crear(datos) {
      const nuevo = {
        id: randomUUID(),
        usuario: normalizar(datos.usuario),
        nombre: datos.nombre.trim(),
        rol: datos.rol,
        passwordHash: datos.passwordHash,
        activo: true,
        creadoEn: new Date().toISOString(),
      };
      try {
        await pool.query('INSERT INTO usuarios (id, usuario, creado_en, doc) VALUES ($1, $2, $3, $4)', [
          nuevo.id,
          nuevo.usuario,
          nuevo.creadoEn,
          nuevo,
        ]);
      } catch (err) {
        if (err.code === '23505') throw new Error(`El usuario "${nuevo.usuario}" ya existe.`);
        throw err;
      }
      return nuevo;
    },
  };

  const insertarTasacion = (cliente, t) =>
    cliente.query('INSERT INTO tasaciones (id, agente_id, creada_en, doc) VALUES ($1, $2, $3, $4)', [
      t.id,
      t.agente?.id ?? null,
      t.creadaEn,
      t,
    ]);

  const tasaciones = {
    /** @param {{agenteId?: string}} filtros */
    async listar({ agenteId } = {}) {
      const { rows } = agenteId
        ? await pool.query('SELECT doc FROM tasaciones WHERE agente_id = $1 ORDER BY creada_en DESC', [agenteId])
        : await pool.query('SELECT doc FROM tasaciones ORDER BY creada_en DESC');
      return rows.map((r) => r.doc);
    },

    async obtener(id) {
      const { rows } = await pool.query('SELECT doc FROM tasaciones WHERE id = $1', [id]);
      return rows[0]?.doc ?? null;
    },

    async crear(tasacion) {
      await insertarTasacion(pool, tasacion);
      return tasacion;
    },

    async crearVarias(lista) {
      const cliente = await pool.connect();
      try {
        await cliente.query('BEGIN');
        for (const t of lista) await insertarTasacion(cliente, t);
        await cliente.query('COMMIT');
        return lista.length;
      } catch (err) {
        await cliente.query('ROLLBACK');
        throw err;
      } finally {
        cliente.release();
      }
    },

    async eliminar(id) {
      const { rowCount } = await pool.query('DELETE FROM tasaciones WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };

  return { usuarios, tasaciones, cerrar: () => pool.end() };
}
