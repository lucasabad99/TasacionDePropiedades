/**
 * Registra el service worker para que la app se pueda instalar en el celular.
 * Solo en el build (en desarrollo complicaría ver los cambios al instante).
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[pwa] No se pudo registrar:', err));
  });
}
