import { PageHeader } from "@/components/layout/PageHeader";
import { listarCuentas } from "@/services/cuentas.service";
import { listarArticulos } from "@/services/articulos.service";
import { listarMovimientos } from "@/services/movimientos.service";
import { MovimientosView } from "@/components/movimientos/MovimientosView";
import { requireSesion } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MovimientosPage() {
  const sesion = await requireSesion();
  const [cuentasDocs, articulosDocs, movimientosDocs] = await Promise.all([
    listarCuentas(),
    listarArticulos(),
    listarMovimientos(),
  ]);

  const cuentas = cuentasDocs.map((c) => ({ id: String(c._id), nombre: c.nombre }));
  const articulos = articulosDocs.map((a) => ({
    id: String(a._id),
    nombre: a.nombre,
    precio: a.precio,
  }));

  // IDs de movimientos que ya tienen una reversa apuntándoles
  const reversadosIds = new Set(
    movimientosDocs
      .filter((m) => m.reversaDe != null)
      .map((m) => String(m.reversaDe))
  );

  // Un vendedor solo debe ver los cargos (ventas) que él puede registrar;
  // un abonador solo los abonos. Admin ve todo.
  const tipoVisible = sesion.rol === "vendedor" ? "cargo" : sesion.rol === "abonador" ? "abono" : null;

  const movimientos = movimientosDocs
    .filter((m) => tipoVisible === null || m.tipo === tipoVisible)
    .map((m) => {
      const cuenta = m.cuenta as unknown as { nombre?: string } | null;
      return {
        id: String(m._id),
        fecha: new Date(m.fecha as Date).toISOString(),
        cuentaNombre: cuenta?.nombre ?? "—",
        tipo: m.tipo as "cargo" | "abono",
        monto: m.monto,
        esReversa: Boolean(m.reversaDe),
        yaRevertido: reversadosIds.has(String(m._id)),
        nota: m.nota ?? null,
      };
    });

  return (
    <>
      <PageHeader title="Movimientos" subtitle="Registra ventas y abonos" />
      <MovimientosView
        rol={sesion.rol}
        cuentas={cuentas}
        articulos={articulos}
        movimientos={movimientos}
      />
    </>
  );
}
