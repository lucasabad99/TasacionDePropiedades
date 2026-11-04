import { appConfig } from '../config/app.js';
import { irALogin, obtenerSesion } from './sesion.js';

export class ApiError extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

async function request(ruta, { method = 'GET', body, timeout = 8000, publico = false } = {}) {
  const sesion = publico ? null : obtenerSesion();
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (sesion) headers.Authorization = `Bearer ${sesion.token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${appConfig.apiUrl}/api${ruta}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);

    // Sesión vencida o usuario desactivado: volver al login
    if (res.status === 401 && !publico) irALogin({ motivo: 'vencida' });

    if (!res.ok) throw new ApiError(data?.error || `Error del servidor (${res.status}).`, res.status);
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('No se pudo conectar con el servidor.', 0);
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  // Públicas
  obtenerConfig: () => request('/config', { timeout: 4000, publico: true }),
  login: (usuario, password) => request('/auth/login', { method: 'POST', body: { usuario, password }, publico: true }),
  accesosDemo: () => request('/auth/demo', { timeout: 4000, publico: true }),

  // Con sesión
  listarTasaciones: () => request('/tasaciones'),
  crearTasacion: (payload) => request('/tasaciones', { method: 'POST', body: payload }),
  eliminarTasacion: (id) => request(`/tasaciones/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Solo admin
  resumenAgentes: () => request('/admin/agentes'),
};
