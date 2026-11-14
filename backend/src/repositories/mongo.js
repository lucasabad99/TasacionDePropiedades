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
  const colFotos = db.collection('fotos');
  const colConsultas = db.collection('consultas');

  await Promise.all([
    colUsuarios.createIndex({ id: 1 }, { unique: true }),
    colUsuarios.createIndex({ usuario: 1 }, { unique: true }),
    colTasaciones.createIndex({ id: 1 }, { unique: true }),
    colTasaciones.createIndex({ 'agente.id': 1, creadaEn: -1 }),
    colFotos.createIndex({ id: 1 }, { unique: true }),
    colConsultas.createIndex({ id: 1 }, { unique: true }),
    colConsultas.createIndex({ creadaEn: -1 }),
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

    async actualizar(id, cambios) {
      return colTasaciones.findOneAndUpdate({ id }, { $set: cambios }, { returnDocument: 'after', ...SIN_ID_MONGO });
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

  /** Fotos: la imagen va en el mismo documento (comprimida en el navegador, ~300 KB). */
  const SIN_BYTES = { projection: { _id: 0, datos: 0 } };
  const fotos = {
    obtenerMeta: (id) => colFotos.findOne({ id }, SIN_BYTES),

    async crear({ agenteId, contentType, datos }) {
      const foto = { id: randomUUID(), agenteId, contentType, tamano: datos.length, creadaEn: new Date().toISOString() };
      await colFotos.insertOne({ ...foto, datos });
      return foto;
    },

    async obtener(id) {
      const foto = await colFotos.findOne({ id }, SIN_ID_MONGO);
      if (!foto) return null;
      const { datos } = foto; // Binary de BSON → Buffer
      return { ...foto, datos: Buffer.from(datos.buffer.subarray(0, datos.position)) };
    },

    async eliminar(ids) {
      if (ids.length) await colFotos.deleteMany({ id: { $in: ids } });
    },
  };

  const consultas = {
    listar: () => colConsultas.find({}, SIN_ID_MONGO).sort({ creadaEn: -1 }).toArray(),

    async crear(consulta) {
      await colConsultas.insertOne({ ...consulta });
      return consulta;
    },

    async eliminar(id) {
      const { deletedCount } = await colConsultas.deleteOne({ id });
      return deletedCount > 0;
    },
  };

  return { usuarios, tasaciones, fotos, consultas, cerrar: () => cliente.close() };
}
