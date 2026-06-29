"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatMXN, toCentavos } from "@/lib/money";

interface CuentaInfo {
  id: string;
  nombre: string;
  tipo: string;
  grado: string | null;
  grupo: string | null;
  saldoActual: number;
  limiteCredito: number | null;
}

interface ArticuloOpt { id: string; nombre: string; precio: number }

interface LedgerRow {
  id: string;
  fecha: string;
  tipo: "cargo" | "abono";
  monto: number;
  saldoCorriente: number;
  esReversa: boolean;
  lineas: { nombre: string; cantidad: number; precioUnitario: number }[];
  metodoPago: string | null;
  nota: string | null;
}

const inputCls =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-antara";
const filterCls =
  "rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-antara";
const btnPrimary =
  "cursor-pointer rounded-lg bg-antara px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-antara-dark disabled:opacity-60 disabled:cursor-not-allowed";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
        {label}
      </span>
      {children}
    </label>
  );
}

// ---------- Forma rápida de venta ----------
function VentaRapidaForm({
  cuentaId,
  articulos,
  onDone,
}: {
  cuentaId: string;
  articulos: ArticuloOpt[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [articuloId, setArticuloId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [lineas, setLineas] = useState<{ articuloId: string; cantidad: number }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const art = (id: string) => articulos.find((a) => a.id === id);
  const total = lineas.reduce((s, l) => s + (art(l.articuloId)?.precio ?? 0) * l.cantidad, 0);

  function agregar() {
    if (!articuloId || cantidad < 1) return;
    setLineas((prev) => {
      const i = prev.findIndex((l) => l.articuloId === articuloId);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], cantidad: copy[i].cantidad + cantidad };
        return copy;
      }
      return [...prev, { articuloId, cantidad }];
    });
    setArticuloId("");
    setCantidad(1);
  }

  async function registrar() {
    setError(null);
    if (!lineas.length) return setError("Agrega al menos un producto");
    setEnviando(true);
    try {
      const res = await fetch("/api/movimientos/venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuentaId, lineas }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo registrar");
      setLineas([]);
      onDone();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Producto">
          <select value={articuloId} onChange={(e) => setArticuloId(e.target.value)} className={inputCls}>
            <option value="">Selecciona…</option>
            {articulos.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre} · {formatMXN(a.precio)}</option>
            ))}
          </select>
        </Field>
        <Field label="Cantidad">
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
            className={`${inputCls} w-24`}
          />
        </Field>
        <button
          type="button"
          onClick={agregar}
          className="cursor-pointer rounded-lg border border-antara px-4 py-2 text-sm font-medium text-antara hover:bg-antara/5"
        >
          Agregar
        </button>
      </div>

      {lineas.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {lineas.map((l) => {
            const a = art(l.articuloId);
            return (
              <li key={l.articuloId} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-ink">{a?.nombre} × {l.cantidad}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-ink/70">{formatMXN((a?.precio ?? 0) * l.cantidad)}</span>
                  <button
                    type="button"
                    onClick={() => setLineas((p) => p.filter((x) => x.articuloId !== l.articuloId))}
                    className="text-debt hover:underline"
                  >
                    ✕
                  </button>
                </span>
              </li>
            );
          })}
          <li className="flex items-center justify-between bg-paper px-4 py-2 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMXN(total)}</span>
          </li>
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-debt">{error}</p>}

      <div className="mt-4">
        <button type="button" onClick={registrar} disabled={enviando} className={btnPrimary}>
          {enviando ? "Registrando…" : "Registrar venta"}
        </button>
      </div>
    </div>
  );
}

// ---------- Forma rápida de abono ----------
function AbonoRapidoForm({ cuentaId, onDone }: { cuentaId: string; onDone: () => void }) {
  const router = useRouter();
  const [montoStr, setMontoStr] = useState("");
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia" | "otro">("efectivo");
  const [referencia, setReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function registrar() {
    setError(null);
    const montoPesos = parseFloat(montoStr);
    if (!montoPesos || montoPesos <= 0) return setError("Ingresa un monto válido");
    setEnviando(true);
    try {
      const res = await fetch("/api/movimientos/abono", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuentaId,
          monto: toCentavos(montoPesos),
          metodoPago: metodo,
          referencia: referencia.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo registrar");
      setMontoStr("");
      setReferencia("");
      onDone();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Monto (MXN)">
          <input
            type="number"
            inputMode="decimal"
            min={0.01}
            step="0.01"
            value={montoStr}
            onChange={(e) => setMontoStr(e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
        </Field>
        <Field label="Método de pago">
          <select value={metodo} onChange={(e) => setMetodo(e.target.value as typeof metodo)} className={inputCls}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
        <Field label="Referencia (opcional)">
          <input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={inputCls} />
        </Field>
      </div>

      {error && <p className="mt-3 text-sm text-debt">{error}</p>}

      <div className="mt-4">
        <button type="button" onClick={registrar} disabled={enviando} className={btnPrimary}>
          {enviando ? "Registrando…" : "Registrar abono"}
        </button>
      </div>
    </div>
  );
}

// ---------- Descripción de cada fila del ledger ----------
function descMovimiento(row: LedgerRow): string {
  if (row.esReversa) {
    return row.tipo === "abono" ? "Reversa de venta" : "Reversa de abono";
  }
  if (row.tipo === "cargo" && row.lineas.length > 0) {
    return row.lineas.map((l) => `${l.nombre} ×${l.cantidad}`).join(", ");
  }
  return row.metodoPago ? `Abono (${row.metodoPago})` : "Abono";
}

// ---------- Vista principal ----------
export function CuentaDetalleView({
  cuenta,
  ledger,
  articulos,
}: {
  cuenta: CuentaInfo;
  ledger: LedgerRow[];
  articulos: ArticuloOpt[];
}) {
  const [panel, setPanel] = useState<"venta" | "abono" | null>(null);

  // Filtros del ledger
  const [filtroTipo, setFiltroTipo] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const hayFiltros = filtroTipo || fechaDesde || fechaHasta;

  const ledgerFiltrado = useMemo(() => {
    return ledger.filter((row) => {
      if (filtroTipo && row.tipo !== filtroTipo) return false;
      if (fechaDesde || fechaHasta) {
        const rowFecha = new Date(row.fecha).toLocaleDateString("en-CA");
        if (fechaDesde && rowFecha < fechaDesde) return false;
        if (fechaHasta && rowFecha > fechaHasta) return false;
      }
      return true;
    });
  }, [ledger, filtroTipo, fechaDesde, fechaHasta]);

  function limpiarFiltros() {
    setFiltroTipo("");
    setFechaDesde("");
    setFechaHasta("");
  }

  function togglePanel(p: "venta" | "abono") {
    setPanel((prev) => (prev === p ? null : p));
  }

  return (
    <>
      {/* Resumen de cuenta */}
      <div className="mb-8 rounded-xl border border-line bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50">
              {cuenta.tipo === "alumno" ? "Alumno" : "Empleado"}
              {cuenta.grado
                ? ` · ${cuenta.grado}${cuenta.grupo ? " " + cuenta.grupo : ""}`
                : ""}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-ink">{cuenta.nombre}</h2>
            {cuenta.limiteCredito != null && (
              <p className="mt-1 text-xs text-ink/50">
                Límite de crédito: {formatMXN(cuenta.limiteCredito)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink/50">Saldo actual</p>
            <p
              className={`mt-1 font-display text-3xl font-bold tabular-nums ${
                cuenta.saldoActual > 0
                  ? "text-debt"
                  : cuenta.saldoActual < 0
                  ? "text-paid"
                  : "text-ink/40"
              }`}
            >
              {formatMXN(cuenta.saldoActual)}
            </p>
            {cuenta.saldoActual !== 0 && (
              <p className="mt-0.5 text-xs text-ink/40">
                {cuenta.saldoActual > 0 ? "debe" : "saldo a favor"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="mb-4 flex gap-3">
        <button
          type="button"
          onClick={() => togglePanel("venta")}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            panel === "venta"
              ? "bg-antara-dark text-white"
              : "bg-antara text-white hover:bg-antara-dark"
          }`}
        >
          {panel === "venta" ? "Cancelar" : "Registrar venta"}
        </button>
        <button
          type="button"
          onClick={() => togglePanel("abono")}
          className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            panel === "abono"
              ? "border-paid bg-paid/5 text-paid"
              : "border-paid text-paid hover:bg-paid/5"
          }`}
        >
          {panel === "abono" ? "Cancelar" : "Registrar abono"}
        </button>
      </div>

      {panel === "venta" && (
        <div className="mb-8">
          <VentaRapidaForm
            cuentaId={cuenta.id}
            articulos={articulos}
            onDone={() => setPanel(null)}
          />
        </div>
      )}
      {panel === "abono" && (
        <div className="mb-8">
          <AbonoRapidoForm cuentaId={cuenta.id} onDone={() => setPanel(null)} />
        </div>
      )}

      {/* Ledger */}
      <h3 className="mb-3 font-display text-lg font-bold text-ink">Estado de cuenta</h3>

      {ledger.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-sm text-ink/60">Sin movimientos en esta cuenta todavía.</p>
        </div>
      ) : (
        <>
          {/* Barra de filtros del ledger */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className={filterCls}
            >
              <option value="">Todos los movimientos</option>
              <option value="cargo">Solo cargos</option>
              <option value="abono">Solo abonos</option>
            </select>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              title="Desde"
              className={filterCls}
            />
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              title="Hasta"
              className={filterCls}
            />
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="text-xs text-ink/40 hover:text-debt"
              >
                Limpiar
              </button>
            )}
            <span className="ml-auto text-xs text-ink/40">
              {ledgerFiltrado.length} de {ledger.length}
            </span>
          </div>

          {ledgerFiltrado.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
              <p className="text-sm text-ink/60">Sin resultados para los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/50">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Concepto</th>
                    <th className="px-4 py-3 text-right font-medium">Cargo</th>
                    <th className="px-4 py-3 text-right font-medium">Abono</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerFiltrado.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-ink/70">
                        {new Date(row.fecha).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {descMovimiento(row)}
                        {row.nota && (
                          <span className="ml-2 text-xs text-ink/40">· {row.nota}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-debt">
                        {row.tipo === "cargo" ? formatMXN(row.monto) : ""}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-paid">
                        {row.tipo === "abono" ? formatMXN(row.monto) : ""}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium tabular-nums ${
                          row.saldoCorriente > 0
                            ? "text-debt"
                            : row.saldoCorriente < 0
                            ? "text-paid"
                            : "text-ink/40"
                        }`}
                      >
                        {formatMXN(row.saldoCorriente)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
