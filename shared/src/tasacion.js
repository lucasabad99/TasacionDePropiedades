import { COEFICIENTES, VALORES_INICIALES } from './coeficientes.js';

/** Número positivo o 0 (acepta strings vacíos, null, NaN, negativos). */
const positivo = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const porcentaje = (v) => Math.min(positivo(v), 100);

const existe = (lista, clave, valor) => lista.some((item) => item[clave] === valor);

/**
 * Convierte la entrada cruda (formulario o body de la API) en datos limpios.
 * Nunca lanza: lo inválido se reemplaza por 0 o por el valor por defecto.
 */
export function normalizarDatos(entrada = {}, coef = COEFICIENTES) {
  const multiplo = Number(entrada.multiploEbitda);

  return {
    supCubierta: positivo(entrada.supCubierta),
    supDescubierta: positivo(entrada.supDescubierta),
    precioBaseM2: positivo(entrada.precioBaseM2),
    estado: existe(coef.estados, 'id', entrada.estado) ? entrada.estado : VALORES_INICIALES.estado,
    disposicion: existe(coef.disposiciones, 'id', entrada.disposicion)
      ? entrada.disposicion
      : VALORES_INICIALES.disposicion,
    margenNegociacion: porcentaje(entrada.margenNegociacion),

    incluyeLlave: entrada.incluyeLlave === true || entrada.incluyeLlave === 'true',
    cantConsultorios: positivo(entrada.cantConsultorios),
    canonModulo: positivo(entrada.canonModulo),
    ocupacionPct: porcentaje(entrada.ocupacionPct),
    gastosFijos: positivo(entrada.gastosFijos),
    multiploEbitda: existe(coef.multiplosEbitda, 'valor', multiplo)
      ? multiplo
      : VALORES_INICIALES.multiploEbitda,
  };
}

/**
 * Errores que impiden guardar una tasación.
 * @returns {{campo: string, mensaje: string}[]}
 */
export function validarDatos(entrada, coef = COEFICIENTES) {
  const d = normalizarDatos(entrada, coef);
  const errores = [];

  if (d.supCubierta + d.supDescubierta === 0) {
    errores.push({ campo: 'supCubierta', mensaje: 'Ingresá la superficie del inmueble.' });
  }
  if (d.precioBaseM2 === 0) {
    errores.push({ campo: 'precioBaseM2', mensaje: 'Ingresá el precio base de la zona (USD/m²).' });
  }
  if (d.incluyeLlave && d.cantConsultorios === 0) {
    errores.push({ campo: 'cantConsultorios', mensaje: 'Indicá la cantidad de consultorios de la llave.' });
  }

  return errores;
}

/**
 * Calcula la tasación completa: inmueble + llave de negocio.
 *
 * Inmueble:
 *   sup. homogeneizada = cubierta + descubierta × factor
 *   valor de lista     = sup. homog. × precio base × coef. estado × coef. disposición
 *   valor inmueble     = valor de lista × (1 − margen de negociación)
 *
 * Llave de negocio (si aplica):
 *   ingresos mensuales = consultorios × canon × ocupación
 *   EBITDA anual       = (ingresos − gastos fijos) × 12
 *   valor llave        = EBITDA anual × múltiplo   (0 si el EBITDA no es positivo)
 */
export function calcularTasacion(entrada, coef = COEFICIENTES) {
  const d = normalizarDatos(entrada, coef);

  // --- Inmueble ---
  const coefEstado = coef.estados.find((e) => e.id === d.estado).coef;
  const coefDisposicion = coef.disposiciones.find((e) => e.id === d.disposicion).coef;
  const supHomogenea = d.supCubierta + d.supDescubierta * coef.factorSuperficieDescubierta;
  const valorLista = supHomogenea * d.precioBaseM2 * coefEstado * coefDisposicion;
  const descuentoNegociacion = valorLista * (d.margenNegociacion / 100);
  const valorInmueble = valorLista - descuentoNegociacion;

  // --- Llave de negocio ---
  let ingresosMensuales = 0;
  let ebitdaMensual = 0;
  let valorLlave = 0;

  if (d.incluyeLlave) {
    ingresosMensuales = d.cantConsultorios * d.canonModulo * (d.ocupacionPct / 100);
    ebitdaMensual = ingresosMensuales - d.gastosFijos;
    valorLlave = ebitdaMensual > 0 ? ebitdaMensual * 12 * d.multiploEbitda : 0;
  }

  // --- Advertencias (no bloquean, solo informan) ---
  const advertencias = [];
  if (d.incluyeLlave && ingresosMensuales > 0 && ebitdaMensual <= 0) {
    advertencias.push('Los gastos fijos igualan o superan los ingresos: la llave no suma valor.');
  }
  if (d.margenNegociacion > 20) {
    advertencias.push('El margen de negociación supera el 20%, revisá que sea correcto.');
  }

  return {
    datos: d,
    inmueble: {
      supHomogenea,
      coefEstado,
      coefDisposicion,
      valorLista,
      descuentoNegociacion,
      valor: valorInmueble,
      valorM2: supHomogenea > 0 ? valorInmueble / supHomogenea : 0,
    },
    llave: {
      incluida: d.incluyeLlave,
      ingresosMensuales,
      gastosFijos: d.incluyeLlave ? d.gastosFijos : 0,
      ebitdaMensual,
      ebitdaAnual: ebitdaMensual * 12,
      multiplo: d.multiploEbitda,
      valor: valorLlave,
    },
    total: valorInmueble + valorLlave,
    advertencias,
  };
}
