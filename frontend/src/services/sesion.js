/**
 * Sesión del usuario guardada en el navegador.
 * El token lo emite el backend y vence solo (SESION_HORAS).
 */
const CLAVE = 'tasador:sesion:v1';

const LOGIN = '/login.html';

export function obtenerSesion() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE));
    return s?.token && s.expiraEn > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    /* sin almacenamiento: la sesión no persiste */
  }
}

function borrarSesion() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* idem */
  }
}

export function cerrarSesion() {
  borrarSesion();
  location.replace(LOGIN);
}

/** Manda al login recordando a dónde volver. */
export function irALogin({ motivo } = {}) {
  borrarSesion();
  const params = new URLSearchParams();
  if (!location.pathname.startsWith(LOGIN)) params.set('volver', location.pathname + location.search);
  if (motivo) params.set('motivo', motivo);
  location.replace(params.size ? `${LOGIN}?${params}` : LOGIN);
}

/**
 * Protege una página: sin sesión (o sin el rol pedido) redirige.
 * Devuelve la sesión, o null si se está redirigiendo.
 */
export function requerirSesion({ rol } = {}) {
  const sesion = obtenerSesion();
  if (!sesion) {
    irALogin();
    return null;
  }
  if (rol && sesion.usuario.rol !== rol) {
    location.replace('/');
    return null;
  }
  document.body.classList.add('listo');
  return sesion;
}

/** Página a la que ir después del login (solo rutas internas). */
export function destinoTrasLogin(usuario, volver) {
  const esInterna = typeof volver === 'string' && volver.startsWith('/') && !volver.startsWith('//');
  if (esInterna && !volver.startsWith(LOGIN)) return volver;
  return usuario.rol === 'admin' ? '/admin.html' : '/';
}
