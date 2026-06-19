// Todos los montos del sistema se almacenan como ENTEROS en centavos (MXN).
// Esto evita los errores de redondeo acumulados que generan los floats.
// Ej: $15.50 se guarda como 1550.

export const toCentavos = (pesos: number): number => Math.round(pesos * 100);

export const toPesos = (centavos: number): number => centavos / 100;

export const formatMXN = (centavos: number): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(centavos / 100);
