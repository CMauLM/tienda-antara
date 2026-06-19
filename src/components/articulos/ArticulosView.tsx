"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMXN, toCentavos, toPesos } from "@/lib/money";

interface ArticuloRow {
  id: string;
  nombre: string;
  categoria: "desayuno" | "bebida" | "snack" | "otro";
  precio: number; // centavos
  activo: boolean;
}

const CATEGORIAS = ["desayuno", "bebida", "snack", "otro"] as const;
const CATEGORIA_LABEL: Record<string, string> = {
  desayuno: "Desayuno",
  bebida: "Bebida",
  snack: "Snack",
  otro: "Otro",
};

const inputCls =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-antara";
const btnPrimary =
  "rounded-lg bg-antara px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-antara-dark disabled:opacity-60";

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

export function ArticulosView({ articulos }: { articulos: ArticuloRow[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<ArticuloRow | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  function abrirNuevo() {
    setEditando(null);
    setError(null);
    setAbierto(true);
  }

  function abrirEditar(art: ArticuloRow) {
    setEditando(art);
    setError(null);
    setAbierto(true);
  }

  function cancelar() {
    setAbierto(false);
    setEditando(null);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const precioPesos = parseFloat(String(fd.get("precio") ?? "0"));

    const payload = {
      nombre: String(fd.get("nombre") ?? "").trim(),
      categoria: String(fd.get("categoria") ?? ""),
      precio: toCentavos(precioPesos),
    };

    setEnviando(true);
    try {
      const res = editando
        ? await fetch(`/api/articulos/${editando.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/articulos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo guardar");
      cancelar();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function toggleActivo(art: ArticuloRow) {
    setToggleError(null);
    try {
      const res = await fetch(`/api/articulos/${art.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !art.activo }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo actualizar");
      router.refresh();
    } catch (err) {
      setToggleError((err as Error).message);
    }
  }

  const formKey = editando?.id ?? "nuevo";

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button
          onClick={abierto ? cancelar : abrirNuevo}
          className={btnPrimary}
        >
          {abierto ? "Cancelar" : "Nuevo artículo"}
        </button>
      </div>

      {abierto && (
        <form
          key={formKey}
          onSubmit={onSubmit}
          className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-2"
        >
          <Field label="Nombre">
            <input
              name="nombre"
              required
              defaultValue={editando?.nombre ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Categoría">
            <select
              name="categoria"
              defaultValue={editando?.categoria ?? "desayuno"}
              className={inputCls}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Precio (MXN)">
            <input
              name="precio"
              type="number"
              inputMode="decimal"
              min={0.01}
              step="0.01"
              required
              defaultValue={editando ? toPesos(editando.precio).toFixed(2) : ""}
              placeholder="0.00"
              className={inputCls}
            />
          </Field>

          {error && <p className="text-sm text-debt sm:col-span-2">{error}</p>}

          <div className="sm:col-span-2">
            <button type="submit" disabled={enviando} className={btnPrimary}>
              {enviando ? "Guardando…" : editando ? "Actualizar" : "Guardar artículo"}
            </button>
          </div>
        </form>
      )}

      {toggleError && (
        <p className="mb-4 text-sm text-debt">{toggleError}</p>
      )}

      {articulos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-sm text-ink/60">
            Aún no hay artículos. Crea el primero con "Nuevo artículo".
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {articulos.map((a) => (
                <tr
                  key={a.id}
                  className={`border-b border-line last:border-0 ${!a.activo ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-ink">{a.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-antara/10 px-2 py-0.5 text-xs font-medium text-antara">
                      {CATEGORIA_LABEL[a.categoria]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {formatMXN(a.precio)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActivo(a)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        a.activo
                          ? "bg-paid/10 text-paid hover:bg-paid/20"
                          : "bg-ink/10 text-ink/50 hover:bg-ink/20"
                      }`}
                    >
                      {a.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => abrirEditar(a)}
                      className="text-xs text-antara hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
