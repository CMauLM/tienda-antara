"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { formatMXN, toCentavos } from "@/lib/money";
import { inputDesdeFechaLocal, inputDesdeFechaUTC } from "@/lib/fecha";
import { Combobox } from "@/components/ui/Combobox";

interface CuentaOpt { id: string; nombre: string; detalle?: string }
interface ArticuloOpt { id: string; nombre: string; precio: number }
interface MovRow {
  id: string;
  fechaConsumo: string;
  fechaCaptura: string;
  cuentaNombre: string;
  tipo: "cargo" | "abono";
  monto: number;
  metodoPago: "efectivo" | "transferencia" | "otro" | null;
  esReversa: boolean;
  yaRevertido: boolean;
  nota: string | null;
}
interface FiltroInicial {
  tipo: string;
  desde: string;
  desdeEsDefault: boolean;
  hasta: string;
  porFecha: "consumo" | "captura";
}

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  otro: "Otro",
};

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
  const [fechaConsumo, setFechaConsumo] = useState(() => inputDesdeFechaLocal(new Date()));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const art = (id: string) => articulos.find((a) => a.id === id);
  const artSel = articuloId ? art(articuloId) : null;
  const total = lineas.reduce((s, l) => s + (art(l.articuloId)?.precio ?? 0) * l.cantidad, 0);

  // Opciones para los Comboboxes
  const cuentaOpts = useMemo(
    () => cuentas.map((c) => ({ value: c.id, label: c.nombre, meta: c.detalle })),
    [cuentas]
  );
  const articuloOpts = useMemo(
    () =>
      articulos.map((a) => ({
        value: a.id,
        label: a.nombre,
        meta: formatMXN(a.precio),
      })),
    [articulos]
  );

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
        body: JSON.stringify({ cuentaId, lineas, fechaConsumo }),
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        {/* Cuenta */}
        <Field label="Cuenta">
          <Combobox
            options={cuentaOpts}
            value={cuentaId}
            onChange={setCuentaId}
            placeholder="Escribe el nombre de la cuenta…"
          />
        </Field>
        <Field label="Fecha de consumo">
          <input
            type="date"
            value={fechaConsumo}
            max={inputDesdeFechaLocal(new Date())}
            onChange={(e) => setFechaConsumo(e.target.value)}
            className={`${inputCls} w-44`}
          />
        </Field>
      </div>

      {/* Producto + cantidad + botón Agregar */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <Field label="Producto">
            <Combobox
              options={articuloOpts}
              value={articuloId}
              onChange={setArticuloId}
              placeholder="Escribe el nombre del producto…"
            />
          </Field>
          {/* Chip de precio + subtotal cuando hay producto seleccionado */}
          {artSel && (
            <p className="mt-1.5 flex items-center gap-2 text-xs text-ink/50">
              <span>
                Precio unitario:{" "}
                <span className="font-medium tabular-nums text-ink/80">
                  {formatMXN(artSel.precio)}
                </span>
              </span>
              {cantidad > 1 && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    Subtotal:{" "}
                    <span className="font-medium tabular-nums text-ink/80">
                      {formatMXN(artSel.precio * cantidad)}
                    </span>
                  </span>
                </>
              )}
            </p>
          )}
        </div>

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
          disabled={!articuloId}
          className="cursor-pointer rounded-lg border border-antara px-4 py-2 text-sm font-medium text-antara transition-colors hover:bg-antara/5 disabled:cursor-not-allowed disabled:border-line disabled:text-ink/30"
        >
          Agregar
        </button>
      </div>

      {/* Lista de productos agregados */}
      {lineas.length > 0 && (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line">
          {lineas.map((l) => {
            const a = art(l.articuloId);
            return (
              <li
                key={l.articuloId}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="text-ink">
                  {a?.nombre}
                  <span className="ml-1 text-ink/40">× {l.cantidad}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-ink/70">
                    {formatMXN((a?.precio ?? 0) * l.cantidad)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLineas((p) =>
                        p.filter((x) => x.articuloId !== l.articuloId)
                      )
                    }
                    className="cursor-pointer text-ink/30 transition-colors hover:text-debt"
                    aria-label={`Quitar ${a?.nombre}`}
                  >
                    ✕
                  </button>
                </span>
              </li>
            );
          })}
          <li className="flex items-center justify-between bg-paper px-4 py-2.5 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMXN(total)}</span>
          </li>
        </ul>
      )}

      {error && <p className="mt-4 text-sm text-debt">{error}</p>}

      <div className="mt-5">
        <button
          type="button"
          onClick={registrar}
          disabled={enviando || !cuentaId || lineas.length === 0}
          className={btnPrimary}
        >
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

  const cuentaOpts = useMemo(
    () => cuentas.map((c) => ({ value: c.id, label: c.nombre, meta: c.detalle })),
    [cuentas]
  );

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
        <div className="sm:col-span-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Cuenta
            </span>
            <Combobox
              options={cuentaOpts}
              value={cuentaId}
              onChange={setCuentaId}
              placeholder="Escribe el nombre de la cuenta…"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
            Monto (MXN)
          </span>
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
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
            Método de pago
          </span>
          <select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as typeof metodo)}
            className={inputCls}
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
            Referencia (opcional)
          </span>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-debt">{error}</p>}

      <div className="mt-5">
        <button
          type="button"
          onClick={registrar}
          disabled={enviando}
          className={btnPrimary}
        >
          {enviando ? "Registrando…" : "Registrar abono"}
        </button>
      </div>
    </div>
  );
}

// ---------- Lista con filtros, resumen (corte de caja) y botón Anular ----------
function MovimientosList({
  movimientos,
  permiteAnular,
  rol,
  filtroInicial,
}: {
  movimientos: MovRow[];
  permiteAnular: boolean;
  rol: "admin" | "vendedor" | "abonador";
  filtroInicial: FiltroInicial;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [anulando, setAnulando] = useState<string | null>(null);
  const [anularError, setAnularError] = useState<string | null>(null);

  // Tipo y rango de fechas viven en la URL: cambiarlos navega y trae del
  // servidor el rango exacto (nunca se recorta a "los últimos N" en el
  // cliente, para que un corte de caja de una semana pasada sea completo).
  // Búsqueda y método de pago solo acotan lo ya traído, sin ir al servidor.
  const [busqueda, setBusqueda] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  // Orden de la columna Fecha, sobre los movimientos ya traídos (sin ir al
  // servidor). false = más reciente primero, igual que el orden que ya
  // trae el servidor por default.
  const [ordenAsc, setOrdenAsc] = useState(false);

  const puedeVerCargos = rol !== "abonador";
  const puedeVerAbonos = rol !== "vendedor";

  const hayFiltros =
    busqueda ||
    filtroMetodo ||
    filtroInicial.tipo ||
    filtroInicial.hasta ||
    !filtroInicial.desdeEsDefault ||
    filtroInicial.porFecha !== "consumo";

  function actualizarUrl(cambios: Partial<FiltroInicial>) {
    const nuevo = { ...filtroInicial, ...cambios };
    const params = new URLSearchParams();
    if (nuevo.tipo) params.set("tipo", nuevo.tipo);
    if (nuevo.desde) params.set("desde", nuevo.desde);
    if (nuevo.hasta) params.set("hasta", nuevo.hasta);
    if (nuevo.porFecha !== "consumo") params.set("porFecha", nuevo.porFecha);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const filtradas = useMemo(() => {
    return movimientos.filter((m) => {
      if (busqueda && !m.cuentaNombre.toLowerCase().includes(busqueda.toLowerCase()))
        return false;
      // El tipo ya viene filtrado desde el servidor; aquí solo se excluyen
      // las reversas cuando se pidió un tipo específico (una reversa de
      // venta es tipo "abono" en el ledger, pero no es un pago — mezclarla
      // aquí infla el total frente al resumen/panel).
      if (filtroInicial.tipo && m.esReversa) return false;
      if (filtroMetodo && m.metodoPago !== filtroMetodo) return false;
      return true;
    });
  }, [movimientos, busqueda, filtroInicial.tipo, filtroMetodo]);

  const ordenadas = useMemo(() => {
    const copia = [...filtradas];
    copia.sort((a, b) => {
      const diff = new Date(a.fechaConsumo).getTime() - new Date(b.fechaConsumo).getTime();
      return ordenAsc ? diff : -diff;
    });
    return copia;
  }, [filtradas, ordenAsc]);

  // Resumen dinámico (corte de caja): neto de reversas — ni las reversas
  // mismas ni los movimientos que ya fueron anulados cuentan aquí.
  const resumen = useMemo(() => {
    let cargos = 0, cargosN = 0, abonos = 0, abonosN = 0;
    const porMetodo: Record<string, { monto: number; n: number }> = {
      efectivo: { monto: 0, n: 0 },
      transferencia: { monto: 0, n: 0 },
      otro: { monto: 0, n: 0 },
    };
    for (const m of filtradas) {
      if (m.esReversa || m.yaRevertido) continue;
      if (m.tipo === "cargo") {
        cargos += m.monto;
        cargosN++;
      } else {
        abonos += m.monto;
        abonosN++;
        if (m.metodoPago) {
          porMetodo[m.metodoPago].monto += m.monto;
          porMetodo[m.metodoPago].n++;
        }
      }
    }
    return { cargos, cargosN, abonos, abonosN, porMetodo };
  }, [filtradas]);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroMetodo("");
    router.push(pathname);
  }

  async function anular(m: MovRow) {
    if (
      !confirm(
        `¿Anular este movimiento de ${m.tipo === "cargo" ? "cargo" : "abono"} por ${formatMXN(m.monto)}?`
      )
    )
      return;
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

  if (movimientos.length === 0 && !hayFiltros) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
        <p className="text-sm text-ink/60">Sin movimientos todavía.</p>
      </div>
    );
  }

  return (
    <>
      {anularError && <p className="mb-3 text-sm text-debt">{anularError}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar cuenta…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={`${filterCls} min-w-[160px] flex-1`}
        />
        {rol === "admin" && (
          <select
            value={filtroInicial.tipo}
            onChange={(e) => actualizarUrl({ tipo: e.target.value })}
            className={filterCls}
          >
            <option value="">Todos los tipos</option>
            <option value="cargo">Cargo</option>
            <option value="abono">Abono</option>
          </select>
        )}
        {puedeVerAbonos && (filtroInicial.tipo === "" || filtroInicial.tipo === "abono") && (
          <select
            value={filtroMetodo}
            onChange={(e) => setFiltroMetodo(e.target.value)}
            className={filterCls}
          >
            <option value="">Cualquier método</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="otro">Otro</option>
          </select>
        )}
        <select
          value={filtroInicial.porFecha}
          onChange={(e) => actualizarUrl({ porFecha: e.target.value as "consumo" | "captura" })}
          title="El rango de fechas aplica sobre…"
          className={filterCls}
        >
          <option value="consumo">Por fecha de consumo</option>
          <option value="captura">Por fecha de captura</option>
        </select>
        <input
          type="date"
          value={filtroInicial.desde}
          onChange={(e) => actualizarUrl({ desde: e.target.value })}
          title="Desde"
          className={filterCls}
        />
        <input
          type="date"
          value={filtroInicial.hasta}
          onChange={(e) => actualizarUrl({ hasta: e.target.value })}
          title="Hasta"
          className={filterCls}
        />
        {hayFiltros && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="cursor-pointer text-xs text-ink/40 hover:text-debt"
          >
            Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-ink/40">
          {filtradas.length} de {movimientos.length}
        </span>
      </div>

      {/* Resumen dinámico — para cortes de caja, neto de anulaciones */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {puedeVerCargos && (filtroInicial.tipo === "" || filtroInicial.tipo === "cargo") && (
          <div className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-ink/50">Ventas</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-debt">
              {formatMXN(resumen.cargos)}
            </p>
            <p className="mt-0.5 text-xs text-ink/40">{resumen.cargosN} movimiento(s)</p>
          </div>
        )}
        {puedeVerAbonos && (filtroInicial.tipo === "" || filtroInicial.tipo === "abono") && (
          <div className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-ink/50">Cobros</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-paid">
              {formatMXN(resumen.abonos)}
            </p>
            <p className="mt-0.5 text-xs text-ink/40">{resumen.abonosN} movimiento(s)</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2 text-xs text-ink/60">
              {(["efectivo", "transferencia", "otro"] as const).map((met) => (
                <span key={met}>
                  {METODO_LABEL[met]}:{" "}
                  <span className="font-medium tabular-nums text-ink">
                    {formatMXN(resumen.porMetodo[met].monto)}
                  </span>{" "}
                  <span className="text-ink/40">({resumen.porMetodo[met].n})</span>
                </span>
              ))}
            </div>
          </div>
        )}
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
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => setOrdenAsc((v) => !v)}
                    className="inline-flex cursor-pointer items-center gap-1 uppercase tracking-wide text-ink/50 hover:text-ink"
                  >
                    Fecha
                    <span aria-hidden>{ordenAsc ? "▲" : "▼"}</span>
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Cuenta</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((m) => {
                const esCargo = m.tipo === "cargo";
                const puedeAnular = permiteAnular && !m.esReversa && !m.yaRevertido;
                return (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-ink/70">
                      {new Date(m.fechaConsumo).toLocaleDateString("es-MX", {
                        timeZone: "UTC",
                        day: "2-digit",
                        month: "short",
                      })}
                      {inputDesdeFechaUTC(new Date(m.fechaConsumo)) !==
                        new Date(m.fechaCaptura).toLocaleDateString("en-CA") && (
                        <span className="block text-xs text-ink/40">
                          capturado{" "}
                          {new Date(m.fechaCaptura).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                          })}{" "}
                          {new Date(m.fechaCaptura).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{m.cuentaNombre}</td>
                    <td className="px-4 py-3">
                      {m.esReversa ? (
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/50">
                          {esCargo ? "Reversa de abono" : "Reversa de venta"}
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            esCargo ? "bg-debt/10 text-debt" : "bg-paid/10 text-paid"
                          }`}
                        >
                          {esCargo ? "Cargo" : "Abono"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink/60">
                      {!esCargo && m.metodoPago ? METODO_LABEL[m.metodoPago] : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums ${
                        m.esReversa ? "text-ink/40" : esCargo ? "text-debt" : "text-paid"
                      }`}
                    >
                      {esCargo ? "+" : "−"}
                      {formatMXN(m.monto)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {puedeAnular ? (
                        <button
                          type="button"
                          onClick={() => anular(m)}
                          disabled={anulando === m.id}
                          className="cursor-pointer rounded-md border border-debt/40 px-2 py-1 text-xs font-medium text-debt transition-colors hover:bg-debt/5 disabled:cursor-not-allowed disabled:opacity-50"
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
  rol,
  cuentas,
  articulos,
  movimientos,
  filtroInicial,
}: {
  rol: "admin" | "vendedor" | "abonador";
  cuentas: CuentaOpt[];
  articulos: ArticuloOpt[];
  movimientos: MovRow[];
  filtroInicial: FiltroInicial;
}) {
  const puedeVender = rol === "admin" || rol === "vendedor";
  const puedeAbonar = rol === "admin" || rol === "abonador";
  const tabs = [
    ...(puedeVender ? (["venta"] as const) : []),
    ...(puedeAbonar ? (["abono"] as const) : []),
  ];

  const [tab, setTab] = useState<"venta" | "abono">(tabs[0] ?? "venta");

  return (
    <>
      {tabs.length > 1 && (
        <div className="mb-6 inline-flex rounded-lg border border-line bg-white p-1">
          {tabs.map((t) => (
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
      )}

      {tab === "venta" && puedeVender ? (
        <VentaForm cuentas={cuentas} articulos={articulos} />
      ) : puedeAbonar ? (
        <AbonoForm cuentas={cuentas} />
      ) : null}

      <h2 className="mb-3 mt-10 font-display text-lg font-bold text-ink">
        Movimientos recientes
      </h2>
      <MovimientosList
        movimientos={movimientos}
        permiteAnular={rol === "admin"}
        rol={rol}
        filtroInicial={filtroInicial}
      />
    </>
  );
}
