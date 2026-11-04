/**
 * Coeficientes de tasación.
 *
 * Es la ÚNICA fuente de verdad de los valores que ajustan la tasación.
 * Para cambiar un porcentaje o agregar una opción, se edita acá y
 * front y back toman el cambio automáticamente.
 */
export const COEFICIENTES = Object.freeze({
  /** Proporción con la que computa la superficie descubierta (0.5 = 50%). */
  factorSuperficieDescubierta: 0.5,

  estados: [
    { id: 'excelente', label: 'Excelente', coef: 1.05 },
    { id: 'bueno', label: 'Bueno', coef: 1.0 },
    { id: 'regular', label: 'Regular', coef: 0.9 },
    { id: 'a-refaccionar', label: 'A refaccionar', coef: 0.8 },
  ],

  disposiciones: [
    { id: 'frente', label: 'Frente', coef: 1.0 },
    { id: 'contrafrente', label: 'Contrafrente', coef: 0.95 },
    { id: 'interno', label: 'Interno', coef: 0.9 },
  ],

  /** Múltiplo del EBITDA anual = años de recupero de la llave. */
  multiplosEbitda: [
    { valor: 1.5, label: 'Conservador', detalle: 'Bajo riesgo' },
    { valor: 2.0, label: 'Promedio de mercado', detalle: 'Referencia habitual' },
    { valor: 2.5, label: 'Consolidado', detalle: 'Alto flujo de pacientes' },
    { valor: 3.0, label: 'Excelente', detalle: 'Buena cápita y convenios' },
  ],

  tiposPropiedad: [
    'Departamento',
    'Casa',
    'PH',
    'Local comercial',
    'Oficina',
    'Consultorio',
    'Terreno',
    'Otro',
  ],
});

/** Valores con los que arranca una tasación nueva. */
export const VALORES_INICIALES = Object.freeze({
  supCubierta: '',
  supDescubierta: '',
  precioBaseM2: '',
  estado: 'bueno',
  disposicion: 'frente',
  margenNegociacion: 5,
  incluyeLlave: false,
  cantConsultorios: '',
  canonModulo: '',
  ocupacionPct: 75,
  gastosFijos: '',
  multiploEbitda: 2,
});
