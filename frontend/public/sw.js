/**
 * Service worker de la app instalable.
 *
 * - La API (/api) nunca pasa por acá: los datos siempre son los del servidor.
 * - Páginas HTML: primero la red (para ver siempre la última versión) y, sin
 *   conexión, la última copia guardada.
 * - Archivos de /assets (llevan un hash en el nombre, no cambian): desde caché.
 *
 * Al cambiar algo importante de esta lógica, subir VERSION.
 */
const VERSION = 'v1';
const CACHE = `tasador-${VERSION}`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(claves.filter((c) => c.startsWith('tasador-') && c !== CACHE).map((c) => caches.delete(c)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(desdeCache(request));
  } else {
    event.respondWith(primeroRed(request));
  }
});

async function desdeCache(request) {
  const guardada = await caches.match(request);
  if (guardada) return guardada;
  const respuesta = await fetch(request);
  if (respuesta.ok) (await caches.open(CACHE)).put(request, respuesta.clone());
  return respuesta;
}

async function primeroRed(request) {
  try {
    const respuesta = await fetch(request);
    if (respuesta.ok) (await caches.open(CACHE)).put(request, respuesta.clone());
    return respuesta;
  } catch (err) {
    const guardada = await caches.match(request, { ignoreSearch: true });
    if (guardada) return guardada;
    throw err;
  }
}
