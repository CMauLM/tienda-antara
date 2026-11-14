import type { listarMovimientosCuenta } from "@/services/movimientos.service";
import { inputDesdeFechaUTC, diaEnZonaTienda } from "@/lib/fecha";

type MovimientoLean = Awaited<ReturnType<typeof listarMovimientosCuenta>>[number];

export interface LedgerRow {
  id: string;
  fechaConsumo: string;
  fechaCaptura: string;
  tipo: "cargo" | "abono";
  monto: number;
  saldoCorriente: number;
  esReversa: boolean;
  lineas: { nombre: string; cantidad: number; precioUnitario: number }[];
  metodoPago: string | null;
  nota: string | null;
}

// Ledger de una cuenta (orden cronológico ASC, con saldo corriente
// acumulado) a partir de los movimientos crudos — lo necesitan por igual
// la página del estado de cuenta y el PDF, así que viven en un solo lugar.
export function construirLedger(movimientosDocs: MovimientoLean[]): LedgerRow[] {
  const ledger: LedgerRow[] = [];
  let saldoCorriente = 0;
  for (const m of movimientosDocs) {
    saldoCorriente += m.tipo === "cargo" ? m.monto : -m.monto;
    ledger.push({
      id: String(m._id),
      fechaConsumo: new Date((m.fechaConsumo ?? m.fecha) as Date).toISOString(),
      fechaCaptura: new Date(m.fecha as Date).toISOString(),
      tipo: m.tipo as "cargo" | "abono",
      monto: m.monto,
      saldoCorriente,
      esReversa: Boolean(m.reversaDe),
      lineas: (m.lineas ?? []).map((l) => ({
        nombre: l.nombre,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
      })),
      metodoPago: (m.metodoPago as string | undefined) ?? null,
      nota: m.nota ?? null,
    });
  }
  return ledger;
}

export interface FiltroLedger {
  tipo?: "cargo" | "abono" | "";
  fechaDesde?: string; // "yyyy-mm-dd"
  fechaHasta?: string; // "yyyy-mm-dd"
  criterioFecha?: "consumo" | "captura";
  ordenAsc?: boolean;
}

// Mismo filtro/orden que ve el admin en pantalla (CuentaDetalleView) — se
// comparte con el PDF para que descargue EXACTAMENTE ese mismo recorte.
export function filtrarYOrdenarLedger(ledger: LedgerRow[], filtro: FiltroLedger = {}): LedgerRow[] {
  const {
    tipo = "",
    fechaDesde = "",
    fechaHasta = "",
    criterioFecha = "consumo",
    ordenAsc = true,
  } = filtro;

  const filtrado = ledger.filter((row) => {
    // "Solo abonos"/"Solo cargos" son movimientos reales, no reversas (una
    // reversa de venta queda como tipo "abono" para el saldo, pero no es
    // un pago — mezclarla aquí infla el total frente a otros resúmenes).
    if (tipo && (row.tipo !== tipo || row.esReversa)) return false;
    if (fechaDesde || fechaHasta) {
      // fechaConsumo es un día-calendario puro, codificado a medianoche
      // UTC — se lee con getters UTC. fechaCaptura es un instante real;
      // su "día" es el que vivió el admin en México, no el de quien
      // ejecute el código (servidor o navegador).
      const rowFecha =
        criterioFecha === "captura"
          ? diaEnZonaTienda(new Date(row.fechaCaptura))
          : inputDesdeFechaUTC(new Date(row.fechaConsumo));
      if (fechaDesde && rowFecha < fechaDesde) return false;
      if (fechaHasta && rowFecha > fechaHasta) return false;
    }
    return true;
  });

  return ordenAsc ? filtrado : [...filtrado].reverse();
}
