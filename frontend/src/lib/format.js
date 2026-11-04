const usd = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

export const fmtUSD = (n) => usd.format(Math.round(n || 0));

export const fmtNum = (n, decimales = 0) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: decimales }).format(n || 0);

const coef = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtCoef = (n) => coef.format(n || 0);

export const fmtFecha = (iso) => fecha.format(new Date(iso));

const fechaCorta = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtFechaCorta = (iso) => fechaCorta.format(new Date(iso));

/** US$ 1,25 M para montos grandes; el resto con formato completo. */
export const fmtUSDCompacto = (n) =>
  Math.abs(n) >= 1_000_000 ? `US$ ${fmtNum(n / 1_000_000, 2)} M` : fmtUSD(n);

const relativo = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
/** "hoy", "ayer", "hace 5 días", "hace 2 meses" */
export const fmtHace = (iso) => {
  const dias = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  return Math.abs(dias) < 45 ? relativo.format(dias, 'day') : relativo.format(Math.round(dias / 30), 'month');
};

/** "María López" → "ML" */
export const iniciales = (nombre) =>
  String(nombre ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

/** "+5%", "−10%" o "Base" a partir de un coeficiente (1.05, 0.9, 1). */
export const fmtAjuste = (coef) => {
  if (coef === 1) return 'Base';
  const pct = Math.round(Math.abs(coef - 1) * 100);
  return `${coef > 1 ? '+' : '−'}${pct}%`;
};

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
