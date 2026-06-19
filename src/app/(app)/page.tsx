import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { obtenerDashboard } from "@/services/dashboard.service";
import { formatMXN } from "@/lib/money";

export const dynamic = "force-dynamic";

const CATEGORIA_LABEL: Record<string, string> = {
  desayuno: "Desayuno",
  bebida: "Bebida",
  snack: "Snack",
  otro: "Otro",
};

const toneClass = { debt: "text-debt", paid: "text-paid", ink: "text-ink" };

export default async function PanelPage() {
  const dash = await obtenerDashboard();

  const tarjetas = [
    { label: "Adeudo total", value: formatMXN(dash.adeudoTotal), tone: "debt" as const },
    { label: "Cobros del mes", value: formatMXN(dash.cobrosDelMes), tone: "paid" as const },
    { label: "Ventas del mes", value: formatMXN(dash.ventasDelMes), tone: "ink" as const },
    { label: "Cuentas con saldo", value: String(dash.cuentasConSaldo), tone: "ink" as const },
  ];

  const totalVentas = dash.ventasPorCategoria.reduce((s, v) => s + v.total, 0);

  return (
    <>
      <PageHeader title="Panel principal" subtitle="Resumen de la tiendita" />

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50">{c.label}</p>
            <p className={`mt-2 font-display text-2xl font-bold tabular-nums ${toneClass[c.tone]}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top deudores */}
        <div>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Top deudores</h2>
          {dash.topDeudores.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center">
              <p className="text-sm text-ink/50">Sin adeudos pendientes.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-white">
              {dash.topDeudores.map((d, i) => (
                <Link
                  key={d.id}
                  href={`/cuentas/${d.id}`}
                  className={`flex items-center justify-between px-4 py-3 transition-colors hover:bg-paper ${
                    i < dash.topDeudores.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium text-ink">{d.nombre}</p>
                    <p className="text-xs capitalize text-ink/50">{d.tipo}</p>
                  </div>
                  <span className="font-display text-base font-bold tabular-nums text-debt">
                    {formatMXN(d.saldoActual)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Ventas por categoría */}
        <div>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Ventas por categoría</h2>
          {dash.ventasPorCategoria.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center">
              <p className="text-sm text-ink/50">Sin ventas registradas.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-white p-5">
              <div className="flex flex-col gap-4">
                {dash.ventasPorCategoria.map((v) => {
                  const pct = totalVentas > 0 ? (v.total / totalVentas) * 100 : 0;
                  return (
                    <div key={v.categoria}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">
                          {CATEGORIA_LABEL[v.categoria] ?? v.categoria}
                        </span>
                        <span className="tabular-nums text-ink/70">{formatMXN(v.total)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-line">
                        <div
                          className="h-2 rounded-full bg-antara transition-all"
                          style={{ width: `${pct.toFixed(1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
