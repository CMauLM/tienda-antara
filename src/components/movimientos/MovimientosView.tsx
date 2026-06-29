"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatMXN, toCentavos } from "@/lib/money";

interface CuentaOpt { id: string; nombre: string }
interface ArticuloOpt { id: string; nombre: string; precio: number }
interface MovRow {
  id: string;
  fecha: string;
  cuentaNombre: string;
  tipo: "cargo" | "abono";
  monto: number;
  esReversa: boolean;
  yaRevertido: boolean;
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

// ---------- Venta ----------
function VentaForm({ cuentas, articulos }: { cuentas: CuentaOpt[]; articulos: ArticuloOpt[] }) {
  const router = useRouter();
  const [cuentaId, setCuentaId] = useState("");
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
    if (!cuentaId) return setError("Selecciona una cuenta");
    if (!lineas.length) return setError("Agrega al menos un producto");
    setEnviando(true);
    try {
      const res = await fetch("/api/movimientos/venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuentaId, lineas }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo registrar la venta");
      setCuentaId("");
      setLineas([]);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Cuenta">
          <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={inputCls}>
            <option value="">Selecciona…</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
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
                    aria-label="Quitar"
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

      {error && <p className="mt-4 text-sm text-debt">{error}</p>}

      <div className="mt-5">
        <button type="button" onClick={registrar} disabled={enviando} className={btnPrimary}>
          {enviando ? "Registrando…" : "Registrar venta"}
        </button>
      </div>
    </div>
  );
}

// ---------- Abono ----------
function AbonoForm({ cuentas }: { cuentas: CuentaOpt[] }) {
  const router = useRouter();
  const [cuentaId, setCuentaId] = useState("");
  const [montoStr, setMontoStr] = useState("");
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia" | "otro">("efectivo");
  const [referencia, setReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function registrar() {
    setError(null);
    const montoPesos = parseFloat(montoStr);
    if (!cuentaId) return setError("Selecciona una cuenta");
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
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo registrar el abono");
      setCuentaId("");
      setMontoStr("");
      setReferencia("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Cuenta">
          <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={inputCls}>
            <option value="">Selecciona…</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </Field>
        <Field label="Monto (MXN)">
          <input
            type="number"
            inputMode="decimal"
            min={0}
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

      {error && <p className="mt-4 text-sm text-debt">{error}</p>}

      <div className="mt-5">
        <button type="button" onClick={registrar} disabled={enviando} className={btnPrimary}>
          {enviando ? "Registrando…" : "Registrar abono"}
        </button>
      </div>
    </div>
  );
}

// ---------- Lista con filtros y botón Anular ----------
function MovimientosList({ movimientos }: { movimientos: MovRow[] }) {
  const router = useRouter();
  const [anulando, setAnulando] = useState<string | null>(null);
  const [anularError, setAnularError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const hayFiltros = busqueda || filtroTipo || fechaDesde || fechaHasta;

  const filtradas = useMemo(() => {
    return movimientos.filter((m) => {
      if (busqueda && !m.cuentaNombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
      if (filtroTipo && m.tipo !== filtroTipo) return false;
      if (fechaDesde || fechaHasta) {
        const movFecha = new Date(m.fecha).toLocaleDateString("en-CA");
        if (fechaDesde && movFecha < fechaDesde) return false;
        if (fechaHasta && movFecha > fechaHasta) return false;
      }
      return true;
    });
  }, [movimientos, busqueda, filtroTipo, fechaDesde, fechaHasta]);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroTipo("");
    setFechaDesde("");
    setFechaHasta("");
  }

  async function anular(m: MovRow) {
    if (!confirm(`¿Anular este movimiento de ${m.tipo === "cargo" ? "cargo" : "abono"} por ${formatMXN(m.monto)}?`)) return;
    setAnularError(null);
    setAnulando(m.id);
    try {
      const res = await fetch(`/api/movimientos/${m.id}/reversa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo anular");
      router.refresh();
    } catch (err) {
      setAnularError((err as Error).message);
    } finally {
      setAnulando(null);
    }
  }

  if (movimientos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
        <p className="text-sm text-ink/60">Sin movimientos todavía.</p>
      </div>
    );
  }

  return (
    <>
      {anularError && <p className="mb-3 text-sm text-debt">{anularError}</p>}

      {/* Barra de filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar cuenta…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={`${filterCls} min-w-[160px] flex-1`}
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className={filterCls}
        >
          <option value="">Todos los tipos</option>
          <option value="cargo">Cargo</option>
          <option value="abono">Abono</option>
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
          {filtradas.length} de {movimientos.length}
        </span>
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-sm text-ink/60">Sin resultados para los filtros aplicados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cuenta</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((m) => {
                const esCargo = m.tipo === "cargo";
                const puedeAnular = !m.esReversa && !m.yaRevertido;
                return (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-ink/70">
                      {new Date(m.fecha).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{m.cuentaNombre}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          esCargo ? "bg-debt/10 text-debt" : "bg-paid/10 text-paid"
                        }`}
                      >
                        {esCargo ? "Cargo" : "Abono"}
                      </span>
                      {m.esReversa && (
                        <span className="ml-2 text-xs text-ink/40">reversa</span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums ${
                        esCargo ? "text-debt" : "text-paid"
                      }`}
                    >
                      {esCargo ? "+" : "−"}{formatMXN(m.monto)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {puedeAnular ? (
                        <button
                          type="button"
                          onClick={() => anular(m)}
                          disabled={anulando === m.id}
                          className="cursor-pointer rounded-md border border-debt/40 px-2 py-1 text-xs font-medium text-debt transition-colors hover:bg-debt/5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {anulando === m.id ? "Anulando…" : "Anular"}
                        </button>
                      ) : (
                        <span className="text-xs text-ink/30">
                          {m.yaRevertido ? "Anulado" : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ---------- Contenedor ----------
export function MovimientosView({
  cuentas,
  articulos,
  movimientos,
}: {
  cuentas: CuentaOpt[];
  articulos: ArticuloOpt[];
  movimientos: MovRow[];
}) {
  const [tab, setTab] = useState<"venta" | "abono">("venta");

  return (
    <>
      <div className="mb-6 inline-flex rounded-lg border border-line bg-white p-1">
        {(["venta", "abono"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-antara text-white" : "text-ink/60 hover:text-ink"
            }`}
          >
            {t === "venta" ? "Registrar venta" : "Registrar abono"}
          </button>
        ))}
      </div>

      {tab === "venta" ? (
        <VentaForm cuentas={cuentas} articulos={articulos} />
      ) : (
        <AbonoForm cuentas={cuentas} />
      )}

      <h2 className="mb-3 mt-10 font-display text-lg font-bold text-ink">
        Movimientos recientes
      </h2>
      <MovimientosList movimientos={movimientos} />
    </>
  );
}
