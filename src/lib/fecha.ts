// "yyyy-mm-dd" (lo que da <input type="date">) -> Date a medianoche LOCAL.
// new Date(string) interpretaría ese string como UTC y desfasaría el día
// en zonas horarias negativas (México) — por eso se construye con
// año/mes/día explícitos en vez de dejar que el motor de JS lo parsee.
export function fechaLocalDesdeInput(yyyyMmDd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Inverso: Date -> "yyyy-mm-dd" en horario local, para precargar <input type="date">.
export function inputDesdeFechaLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
