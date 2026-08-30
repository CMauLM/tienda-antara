import { PageHeader } from "@/components/layout/PageHeader";
import { listarCuentas } from "@/services/cuentas.service";
import { CuentasView } from "@/components/cuentas/CuentasView";
import { requireSesion } from "@/lib/session";

export const dynamic = "force-dynamic"; // datos siempre frescos

export default async function CuentasPage() {
  await requireSesion(["admin", "abonador"]);
  const docs = await listarCuentas();
  const cuentas = docs.map((c) => ({
    id: String(c._id),
    nombre: c.nombre,
    tipo: c.tipo as "alumno" | "empleado",
    seccion: c.seccion ?? null,
    grado: c.grado ?? null,
    grupo: c.grupo ?? null,
    saldoActual: c.saldoActual ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Cuentas"
        subtitle="Alumnos y empleados con cuenta a crédito"
      />
      <CuentasView cuentas={cuentas} />
    </>
  );
}