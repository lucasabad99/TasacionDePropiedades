/** Configuración del frontend leída de las variables VITE_* (.env). */
export const appConfig = Object.freeze({
  nombreInmobiliaria: import.meta.env.VITE_INMOBILIARIA_NOMBRE || 'Tasador Inmobiliario',
  /** Vacío = misma URL que el frontend (en dev, Vite hace proxy de /api). */
  apiUrl: (import.meta.env.VITE_API_URL || '').replace(/\/$/, ''),
});
