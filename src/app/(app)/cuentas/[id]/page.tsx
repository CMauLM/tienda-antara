import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { obtenerCuenta } from "@/services/cuentas.service";
import { listarMovimientosCuenta } from "@/services/movimientos.service";
import { listarArticulos } from "@/services/articulos.service";
import { CuentaDetalleView } from "@/components/cuentas/CuentaDetalleView";
import { requireSesion } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CuentaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSesion(["admin", "abonador"]);
  const { id } = await params;

  const [cuentaDoc, movimientosDocs, articulosDocs] = await Promise.all([
    obtenerCuenta(id),
    listarMovimientosCuenta(id),
    listarArticulos(), // solo activos para el selector de venta
  ]);

  if (!cuentaDoc) notFound();

  const cuenta = {
    id: String(cuentaDoc._id),
    nombre: cuentaDoc.nombre,
    tipo: cuentaDoc.tipo as string,
    grado: cuentaDoc.grado ?? null,
    grupo: cuentaDoc.grupo ?? null,
    saldoActual: cuentaDoc.saldoActual ?? 0,
    limiteCredito: cuentaDoc.limiteCredito ?? null,
  };

  // Calcular saldo corriente en orden cronológico (ASC)
  const ledger: {
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
  }[] = [];
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

  const articulos = articulosDocs.map((a) => ({
    id: String(a._id),
    nombre: a.nombre,
    precio: a.precio,
  }));

  return (
    <>
      <PageHeader
        title={cuentaDoc.nombre}
        subtitle="Detalle de cuenta"
        action={
          <Link href="/cuentas" className="text-sm text-antara hover:underline">
            ← Volver a cuentas
          </Link>
        }
      />
      <CuentaDetalleView cuenta={cuenta} ledger={ledger} articulos={articulos} />
    </>
  );
}
