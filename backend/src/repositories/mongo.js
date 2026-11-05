import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

/**
 * Repositorios sobre MongoDB (se usan cuando existe MONGODB_URI).
 *
 * Misma interfaz que los repositorios de archivo JSON: las rutas no se enteran.
 * Los documentos llevan su propio `id` (UUID); el `_id` interno de Mongo nunca
 * sale de acá.
 */

const SIN_ID_MONGO = { projection: { _id: 0 } };

const normalizar = (usuario) => String(usuario ?? '').trim().toLowerCase();

export async function crearRepositoriosMongo(uri, nombreDb) {
  const cliente = new MongoClient(uri, { appName: 'tasador-inmobiliario' });
  await cliente.connect();
  const db = cliente.db(nombreDb);

  const colUsuarios = db.collection('usuarios');
  const colTasaciones = db.collection('tasaciones');

  await Promise.all([
    colUsuarios.createIndex({ id: 1 }, { unique: true }),
    colUsuarios.createIndex({ usuario: 1 }, { unique: true }),
    colTasaciones.createIndex({ id: 1 }, { unique: true }),
    colTasaciones.createIndex({ 'agente.id': 1, creadaEn: -1 }),
  ]);

  const usuarios = {
    listar: () => colUsuarios.find({}, SIN_ID_MONGO).sort({ creadoEn: 1 }).toArray(),

    obtener: (id) => colUsuarios.findOne({ id }, SIN_ID_MONGO),

    buscarPorUsuario: (usuario) => colUsuarios.findOne({ usuario: normalizar(usuario) }, SIN_ID_MONGO),

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
        await colUsuarios.insertOne({ ...nuevo }); // copia: insertOne le agrega _id al objeto
      } catch (err) {
        if (err.code === 11000) throw new Error(`El usuario "${nuevo.usuario}" ya existe.`);
        throw err;
      }
      return nuevo;
    },
  };

  const tasaciones = {
    /** @param {{agenteId?: string}} filtros */
    listar({ agenteId } = {}) {
      const filtro = agenteId ? { 'agente.id': agenteId } : {};
      // creadaEn es ISO 8601: el orden de texto coincide con el cronológico
      return colTasaciones.find(filtro, SIN_ID_MONGO).sort({ creadaEn: -1 }).toArray();
    },

    obtener: (id) => colTasaciones.findOne({ id }, SIN_ID_MONGO),

    async crear(tasacion) {
      await colTasaciones.insertOne({ ...tasacion });
      return tasacion;
    },

    async crearVarias(lista) {
      if (!lista.length) return 0;
      await colTasaciones.insertMany(lista.map((t) => ({ ...t })));
      return lista.length;
    },

    async eliminar(id) {
      const { deletedCount } = await colTasaciones.deleteOne({ id });
      return deletedCount > 0;
    },
  };

  return { usuarios, tasaciones, cerrar: () => cliente.close() };
}
