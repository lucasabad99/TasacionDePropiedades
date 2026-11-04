/**
 * Borrador local por usuario: si se cierra la pestaña o se bloquea el celular
 * en plena tasación, al volver los datos siguen ahí. Solo vive en este navegador.
 */
export function crearBorrador(usuarioId) {
  const clave = `tasador:borrador:v2:${usuarioId}`;

  return {
    leer() {
      try {
        const raw = localStorage.getItem(clave);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    guardar(valor) {
      try {
        localStorage.setItem(clave, JSON.stringify(valor));
      } catch {
        /* almacenamiento no disponible: se ignora */
      }
    },
    borrar() {
      try {
        localStorage.removeItem(clave);
      } catch {
        /* idem */
      }
    },
  };
}
