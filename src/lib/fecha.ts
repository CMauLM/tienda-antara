// Fechas de "solo calendario" (sin hora): fechaConsumo, y el rango
// desde/hasta de los filtros. Se codifican SIEMPRE a medianoche UTC del día
// elegido, construidas con Date.UTC — nunca con new Date(y, m, d), que
// interpreta año/mes/día en la hora LOCAL de quien ejecuta el código. Eso
// importa porque este código corre en dos lugares con zona horaria
// distinta: el navegador del admin (México) y el servidor de producción en
// Netlify (UTC). Si se construyera con la hora local del servidor, un "11
// de noviembre" capturado en México se guardaría como medianoche UTC del
// 11 — las 6pm del 10 en México — y al mostrarse de vuelta en el navegador
// (que sí usa su hora local) el día se corría al 10. Fijar la codificación
// a UTC, sin importar dónde corra el código, elimina ese desfase.
export function fechaLocalDesdeInput(yyyyMmDd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

// Inverso exacto de fechaLocalDesdeInput: lee con getters UTC, no locales,
// para no desfasar el día al formatear una fecha-calendario ya codificada en
// UTC (p. ej. el desde/hasta de un filtro, de vuelta a un <input type="date">).
export function inputDesdeFechaUTC(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Para precargar "hoy" en un <input type="date"> dentro del NAVEGADOR (ej.
// al abrir el formulario de venta): aquí sí se quiere la hora local real de
// quien está usando el navegador, no UTC.
export function inputDesdeFechaLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Zona horaria real de la tienda — para código que corre tanto en el
// navegador (siempre México) como en el servidor (Netlify, UTC) y necesita
// el mismo resultado en los dos: nunca la TZ "ambiente" de quien ejecute,
// siempre México explícito.
export const ZONA_TIENDA = "America/Mexico_City";

// El día calendario (yyyy-mm-dd) que un instante real representa en
// México, sin importar en qué TZ corra el proceso. Para campos que SÍ son
// un instante con hora (fechaCaptura/`fecha`) pero de los que se necesita
// "qué día fue, en México" — p. ej. comparar contra un filtro de fecha.
export function diaEnZonaTienda(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_TIENDA }).format(d);
}
