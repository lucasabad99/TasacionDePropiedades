const contenedor = () => document.getElementById('toasts');

/** Mensaje breve no bloqueante. tipo: 'info' | 'success' | 'error' */
export function toast(mensaje, tipo = 'info', duracion = 3500) {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = mensaje;
  contenedor().append(el);

  setTimeout(() => {
    el.classList.add('saliendo');
    setTimeout(() => el.remove(), 300);
  }, duracion);
}
