import { dbConnect } from "@/lib/db";
import { CuentaModel } from "@/models/Cuenta";
import { MovimientoModel } from "@/models/Movimiento";

export interface DashboardData {
  adeudoTotal: number;
  cobrosDelMes: number;
  ventasDelMes: number;
  cuentasConSaldo: number;
  topDeudores: { id: string; nombre: string; tipo: string; saldoActual: number }[];
  ventasPorCategoria: { categoria: string; total: number }[];
}

export async function obtenerDashboard(): Promise<DashboardData> {
  await dbConnect();

  // Date.UTC, no hora local del servidor — ver comentario en
  // fechaLocalDesdeInput (src/lib/fecha.ts): fechaConsumo se codifica
  // siempre a medianoche UTC, así que el límite de mes debe quedar en esa
  // misma referencia para que el corte no se desfase según dónde corra.
  const ahora = new Date();
  const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
  const inicioMesSig = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1));

  const [
    adeudoAgg,
    cobrosAgg,
    ventasAgg,
    cuentasConSaldo,
    topDeudoresDocs,
    ventasCatAgg,
  ] = await Promise.all([
    // Adeudo total = suma de saldos positivos
    CuentaModel.aggregate([
      { $match: { activo: true, saldoActual: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$saldoActual" } } },
    ]) as Promise<{ total: number }[]>,

    // Cobros del mes (abonos originales, sin reversas). Un pago no tiene
    // "fecha de consumo" — se queda en `fecha` (cuándo se recibió).
    MovimientoModel.aggregate([
      {
        $match: {
          tipo: "abono",
          reversaDe: null,
          fecha: { $gte: inicioMes, $lt: inicioMesSig },
        },
      },
      { $group: { _id: null, total: { $sum: "$monto" } } },
    ]) as Promise<{ total: number }[]>,

    // Ventas del mes (cargos originales, sin reversas). Por fecha de
    // CONSUMO, no de captura, para que coincida con el mes real en que se
    // comió — no con cuándo el admin tecleó el papel.
    MovimientoModel.aggregate([
      {
        $match: {
          tipo: "cargo",
          reversaDe: null,
          fechaConsumo: { $gte: inicioMes, $lt: inicioMesSig },
        },
      },
      { $group: { _id: null, total: { $sum: "$monto" } } },
    ]) as Promise<{ total: number }[]>,

    // # cuentas con saldo
    CuentaModel.countDocuments({ activo: true, saldoActual: { $gt: 0 } }),

    // Top 5 deudores
    CuentaModel.find({ activo: true, saldoActual: { $gt: 0 } })
      .sort({ saldoActual: -1 })
      .limit(5)
      .select("nombre tipo saldoActual")
      .lean(),

    // Ventas por categoría (lookup al artículo para obtener categoria)
    MovimientoModel.aggregate([
      { $match: { tipo: "cargo", reversaDe: null } },
      { $unwind: "$lineas" },
      {
        $lookup: {
          from: "articulos",
          localField: "lineas.articulo",
          foreignField: "_id",
          as: "art",
        },
      },
      { $unwind: "$art" },
      {
        $group: {
          _id: "$art.categoria",
          total: {
            $sum: { $multiply: ["$lineas.precioUnitario", "$lineas.cantidad"] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]) as Promise<{ _id: string; total: number }[]>,
  ]);

  return {
    adeudoTotal: adeudoAgg[0]?.total ?? 0,
    cobrosDelMes: cobrosAgg[0]?.total ?? 0,
    ventasDelMes: ventasAgg[0]?.total ?? 0,
    cuentasConSaldo,
    topDeudores: topDeudoresDocs.map((c) => ({
      id: String(c._id),
      nombre: c.nombre,
      tipo: c.tipo as string,
      saldoActual: c.saldoActual ?? 0,
    })),
    ventasPorCategoria: ventasCatAgg.map((v) => ({
      categoria: v._id,
      total: v.total,
    })),
  };
}
