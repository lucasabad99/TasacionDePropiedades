/**
 * Precios de referencia del m² (USD) para departamentos en venta.
 *
 * Según dónde esté la propiedad se usa una fuente distinta:
 *  - Ciudad de Buenos Aires → IDECBA (Instituto de Estadística de la Ciudad), por
 *    comuna, cantidad de ambientes y usado / a estrenar.
 *  - Provincia de Buenos Aires → Index Zonaprop, por municipio (GBA Norte, Oeste y Sur).
 *
 * Son PRECIOS DE PUBLICACIÓN (oferta), no de escritura: sirven de punto de
 * partida; el agente siempre puede ajustar el precio base.
 *
 * ── Cómo actualizar (cada trimestre) ──────────────────────────────────────────
 * 1. CABA: buscar en estadisticaciudad.gob.ar el último informe "Dinámica del
 *    mercado de venta de departamentos. Ciudad de Buenos Aires" y copiar el
 *    cuadro "Precio promedio de publicación del metro cuadrado (dólares) de
 *    departamentos en venta por comuna" en CABA.comunas y CABA.total.
 * 2. Provincia: bajar los "Index Zonaprop" de GBA Norte, Oeste y Sur del último
 *    mes y copiar el cuadro "Precio según municipio" en MUNICIPIOS_PBA y
 *    ZONAS_PBA.
 * 3. Actualizar período, URL y REFERENCIAS_ACTUALIZADAS, correr `npm test` y subir.
 * Las tasaciones ya guardadas conservan la referencia con la que se hicieron.
 */

/** Fecha de la última carga de datos (AAAA-MM-DD). */
export const REFERENCIAS_ACTUALIZADAS = '2026-11-13';

export const JURISDICCIONES = Object.freeze([
  { id: 'caba', label: 'Ciudad de Buenos Aires' },
  { id: 'provincia', label: 'Provincia de Buenos Aires' },
]);

// ───────────────────────────── Ciudad de Buenos Aires ─────────────────────────────

const CABA = {
  fuente: {
    nombre: 'IDECBA (Estadística Ciudad) sobre datos de Argenprop',
    periodo: '2° trimestre 2026',
    url: 'https://www.estadisticaciudad.gob.ar/eyc/wp-content/uploads/2026/08/ir_2026_2052.pdf',
  },
  // Cuadro por comuna. Orden: [1 ambiente, 2 ambientes, 3 ambientes]. null = sin dato publicado.
  total: { estrenar: [3105, 3215, 3349], usado: [2561, 2343, 2160] },
  comunas: {
    1: { estrenar: [3279, 3814, 4122], usado: [2319, 2318, 2402] },
    2: { estrenar: [3735, 3893, 3457], usado: [2890, 2680, 2616] },
    3: { estrenar: [2471, 2475, 2883], usado: [2034, 1721, 1599] },
    4: { estrenar: [2526, 2374, 2495], usado: [1832, 1770, 1595] },
    5: { estrenar: [2688, 2926, 2810], usado: [2380, 2084, 1989] },
    6: { estrenar: [2858, 3208, 3251], usado: [2432, 2317, 2181] },
    7: { estrenar: [2467, 2486, 2804], usado: [2262, 2059, 1800] },
    8: { estrenar: [null, null, null], usado: [null, 1536, 1036] },
    9: { estrenar: [2321, 2515, 2749], usado: [2065, 1839, 1663] },
    10: { estrenar: [2331, 2546, 2619], usado: [2111, 1936, 1820] },
    11: { estrenar: [2623, 2750, 3073], usado: [2455, 2254, 2207] },
    12: { estrenar: [3071, 3251, 3235], usado: [2725, 2783, 2649] },
    13: { estrenar: [3539, 3900, 3847], usado: [3207, 3009, 2799] },
    14: { estrenar: [3885, 4005, 4174], usado: [3172, 3118, 2855] },
    15: { estrenar: [2905, 3046, 3156], usado: [2634, 2545, 2258] },
  },
};

/** Los 48 barrios porteños y su comuna. */
export const BARRIOS_CABA = Object.freeze(
  [
    ['Agronomía', 15], ['Almagro', 5], ['Balvanera', 3], ['Barracas', 4], ['Belgrano', 13],
    ['Boedo', 5], ['Caballito', 6], ['Chacarita', 15], ['Coghlan', 12], ['Colegiales', 13],
    ['Constitución', 1], ['Flores', 7], ['Floresta', 10], ['La Boca', 4], ['La Paternal', 15],
    ['Liniers', 9], ['Mataderos', 9], ['Monte Castro', 10], ['Montserrat', 1], ['Nueva Pompeya', 4],
    ['Núñez', 13], ['Palermo', 14], ['Parque Avellaneda', 9], ['Parque Chacabuco', 7], ['Parque Chas', 15],
    ['Parque Patricios', 4], ['Puerto Madero', 1], ['Recoleta', 2], ['Retiro', 1], ['Saavedra', 12],
    ['San Cristóbal', 3], ['San Nicolás', 1], ['San Telmo', 1], ['Vélez Sarsfield', 10], ['Versalles', 10],
    ['Villa Crespo', 15], ['Villa del Parque', 11], ['Villa Devoto', 11], ['Villa General Mitre', 11], ['Villa Lugano', 8],
    ['Villa Luro', 10], ['Villa Ortúzar', 15], ['Villa Pueyrredón', 12], ['Villa Real', 10], ['Villa Riachuelo', 8],
    ['Villa Santa Rita', 11], ['Villa Soldati', 8], ['Villa Urquiza', 12],
  ].map(([nombre, comuna]) => Object.freeze({ nombre, comuna })),
);

// ──────────────────────────── Provincia de Buenos Aires ────────────────────────────

const ZONAS_PBA = {
  gbaNorte: {
    nombre: 'GBA Norte',
    promedio: 2435,
    fuente: {
      nombre: 'Index Zonaprop GBA Norte',
      periodo: 'Octubre 2026',
      url: 'https://www.zonaprop.com.ar/blog/wp-content/uploads/2026/11/INDEX_GBA_NORTE_REPORTE_2026-10.pdf',
    },
  },
  gbaOeste: {
    nombre: 'GBA Oeste',
    promedio: 1574,
    fuente: {
      nombre: 'Index Zonaprop GBA Oeste',
      periodo: 'Octubre 2026',
      url: 'https://www.zonaprop.com.ar/blog/wp-content/uploads/2026/11/INDEX_GBA_OESTE_REPORTE_2026-10.pdf',
    },
  },
  gbaSur: {
    nombre: 'GBA Sur',
    promedio: 1673,
    fuente: {
      nombre: 'Index Zonaprop GBA Sur',
      periodo: 'Septiembre 2026',
      url: 'https://www.zonaprop.com.ar/blog/wp-content/uploads/2026/10/INDEX_GBA_SUR_REPORTE_2026-09.pdf',
    },
  },
};

/** Precio medio de venta de departamentos por municipio (USD/m²). */
export const MUNICIPIOS_PBA = Object.freeze(
  [
    // GBA Norte (octubre 2026)
    ['Vicente López', 'gbaNorte', 3045],
    ['San Isidro', 'gbaNorte', 2845],
    ['Tigre', 'gbaNorte', 2790],
    ['San Fernando', 'gbaNorte', 2304],
    ['Escobar', 'gbaNorte', 1991],
    ['Pilar', 'gbaNorte', 1948],
    ['General San Martín', 'gbaNorte', 1614],
    ['San Miguel', 'gbaNorte', 1606],
    ['Malvinas Argentinas', 'gbaNorte', 1452],
    ['José C. Paz', 'gbaNorte', 1090],
    // GBA Oeste (octubre 2026)
    ['Ituzaingó', 'gbaOeste', 2087],
    ['Morón', 'gbaOeste', 1593],
    ['Merlo', 'gbaOeste', 1549],
    ['La Matanza', 'gbaOeste', 1514],
    ['Tres de Febrero', 'gbaOeste', 1498],
    ['Hurlingham', 'gbaOeste', 1305],
    ['Moreno', 'gbaOeste', 1228],
    // GBA Sur (septiembre 2026)
    ['Ezeiza', 'gbaSur', 2011],
    ['Lomas de Zamora', 'gbaSur', 1942],
    ['Quilmes', 'gbaSur', 1822],
    ['Berazategui', 'gbaSur', 1808],
    ['Almirante Brown', 'gbaSur', 1788],
    ['Esteban Echeverría', 'gbaSur', 1694],
    ['Lanús', 'gbaSur', 1577],
    ['Avellaneda', 'gbaSur', 1500],
    ['La Plata', 'gbaSur', 1479],
    ['Florencio Varela', 'gbaSur', 1477],
  ]
    .map(([nombre, zona, usdM2]) => Object.freeze({ nombre, zona, usdM2 }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
);

// ───────────────────────────────────── API ─────────────────────────────────────

const AMBIENTES_MAX_CABA = 3;

/** Nombres para el selector "Barrio / Partido" según la jurisdicción. */
export function zonasDe(jurisdiccion) {
  if (jurisdiccion === 'caba') return BARRIOS_CABA.map((b) => b.nombre);
  if (jurisdiccion === 'provincia') return MUNICIPIOS_PBA.map((m) => m.nombre);
  return [];
}

const ambientesValidos = (v) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 4) : 2; // sin dato: 2 ambientes (el más común)
};

/**
 * Precio de referencia para la ubicación de la propiedad.
 *
 * @param {{ jurisdiccion?: string, zona?: string, ambientes?: number|string, aEstrenar?: boolean }} ubicacion
 * @returns {null | { usdM2: number, detalle: string, fuente: string, periodo: string, url: string }}
 *   null si no hay dato para esa ubicación (el agente carga el precio a mano).
 */
export function precioReferencia({ jurisdiccion, zona, ambientes, aEstrenar } = {}) {
  if (jurisdiccion === 'caba') {
    const barrio = BARRIOS_CABA.find((b) => b.nombre === zona);
    if (!barrio) return null;

    const amb = ambientesValidos(ambientes);
    const columna = Math.min(amb, AMBIENTES_MAX_CABA) - 1;
    const tipo = aEstrenar ? 'estrenar' : 'usado';
    const textoTipo = aEstrenar ? 'a estrenar' : 'usados';
    const textoAmb = amb > AMBIENTES_MAX_CABA ? '3 amb. (dato publicado más cercano a 4+)' : `${amb} amb.`;

    const deComuna = CABA.comunas[barrio.comuna][tipo][columna];
    const usdM2 = deComuna ?? CABA.total[tipo][columna];
    const donde = deComuna != null ? `Comuna ${barrio.comuna}` : `Promedio Ciudad (sin dato para la Comuna ${barrio.comuna})`;

    return {
      usdM2,
      detalle: `${barrio.nombre} · ${donde} · deptos. ${textoTipo} de ${textoAmb}`,
      fuente: CABA.fuente.nombre,
      periodo: CABA.fuente.periodo,
      url: CABA.fuente.url,
    };
  }

  if (jurisdiccion === 'provincia') {
    const municipio = MUNICIPIOS_PBA.find((m) => m.nombre === zona);
    if (!municipio) return null;
    const z = ZONAS_PBA[municipio.zona];
    return {
      usdM2: municipio.usdM2,
      detalle: `${municipio.nombre} (${z.nombre}) · precio medio de deptos.`,
      fuente: z.fuente.nombre,
      periodo: z.fuente.periodo,
      url: z.fuente.url,
    };
  }

  return null;
}
