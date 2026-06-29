"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMXN } from "@/lib/money";

interface CuentaRow {
  id: string;
  nombre: string;
  tipo: "alumno" | "empleado";
  grado: string | null;
  grupo: string | null;
  saldoActual: number;
}

const inputCls =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-antara";
const filterCls =
  "rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-antara";

function saldoClass(saldo: number) {
  if (saldo > 0) return "text-debt";
  if (saldo < 0) return "text-paid";
  return "text-ink/50";
}

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

export function CuentasView({ cuentas }: { cuentas: CuentaRow[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"alumno" | "empleado">("alumno");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroSaldo, setFiltroSaldo] = useState("");

  const hayFiltros = busqueda || filtroTipo || filtroSaldo;

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((c) => {
      if (busqueda && !c.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
      if (filtroTipo && c.tipo !== filtroTipo) return false;
      if (filtroSaldo === "deuda" && c.saldoActual <= 0) return false;
      if (filtroSaldo === "favor" && c.saldoActual >= 0) return false;
      if (filtroSaldo === "cero" && c.saldoActual !== 0) return false;
      return true;
    });
  }, [cuentas, busqueda, filtroTipo, filtroSaldo]);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroTipo("");
    setFiltroSaldo("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      nombre: String(fd.get("nombre") ?? "").trim(),
      tipo,
      grado: tipo === "alumno" ? String(fd.get("grado") ?? "").trim() || undefined : undefined,
      grupo: tipo === "alumno" ? String(fd.get("grupo") ?? "").trim() || undefined : undefined,
      responsable: {
        nombre: String(fd.get("respNombre") ?? "").trim() || undefined,
        telefono: String(fd.get("respTel") ?? "").trim() || undefined,
      },
    };

    setEnviando(true);
    try {
      const res = await fetch("/api/cuentas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo crear la cuenta");
      }
      setAbierto(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setAbierto((v) => !v)}
          className="cursor-pointer rounded-lg bg-antara px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-antara-dark"
        >
          {abierto ? "Cancelar" : "Nueva cuenta"}
        </button>
      </div>

      {abierto && (
        <form
          onSubmit={onSubmit}
          className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-2"
        >
          <Field label="Nombre">
            <input name="nombre" required className={inputCls} />
          </Field>
          <Field label="Tipo">
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "alumno" | "empleado")}
              className={inputCls}
            >
              <option value="alumno">Alumno</option>
              <option value="empleado">Empleado</option>
            </select>
          </Field>

          {tipo === "alumno" && (
            <>
              <Field label="Grado">
                <input name="grado" className={inputCls} />
              </Field>
              <Field label="Grupo">
                <input name="grupo" className={inputCls} />
              </Field>
            </>
          )}

          <Field label="Responsable (opcional)">
            <input name="respNombre" className={inputCls} />
          </Field>
          <Field label="Teléfono (opcional)">
            <input name="respTel" className={inputCls} />
          </Field>

          {error && <p className="text-sm text-debt sm:col-span-2">{error}</p>}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={enviando}
              className="cursor-pointer rounded-lg bg-antara px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-antara-dark disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enviando ? "Guardando…" : "Guardar cuenta"}
            </button>
          </div>
        </form>
      )}

      {cuentas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-sm text-ink/60">
            Aún no hay cuentas. Crea la primera con "Nueva cuenta".
          </p>
        </div>
      ) : (
        <>
          {/* Barra de filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Buscar por nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`${filterCls} min-w-[180px] flex-1`}
            />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className={filterCls}
            >
              <option value="">Todos los tipos</option>
              <option value="alumno">Alumno</option>
              <option value="empleado">Empleado</option>
            </select>
            <select
              value={filtroSaldo}
              onChange={(e) => setFiltroSaldo(e.target.value)}
              className={filterCls}
            >
              <option value="">Cualquier saldo</option>
              <option value="deuda">Con deuda</option>
              <option value="favor">Saldo a favor</option>
              <option value="cero">Sin movimiento</option>
            </select>
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
              {cuentasFiltradas.length} de {cuentas.length}
            </span>
          </div>

          {cuentasFiltradas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
              <p className="text-sm text-ink/60">Sin resultados para los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/50">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Grado/Grupo</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentasFiltradas.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">
                        <Link href={`/cuentas/${c.id}`} className="hover:text-antara hover:underline">
                          {c.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize text-ink/70">{c.tipo}</td>
                      <td className="px-4 py-3 text-ink/70">
                        {c.grado ? `${c.grado}${c.grupo ? " " + c.grupo : ""}` : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium tabular-nums ${saldoClass(c.saldoActual)}`}
                      >
                        {formatMXN(c.saldoActual)}
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
