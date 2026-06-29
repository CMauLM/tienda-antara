"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "cajero";
  activo: boolean;
}

const ROLES = ["admin", "cajero"] as const;
const ROL_LABEL: Record<string, string> = { admin: "Admin", cajero: "Cajero" };

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

export function UsuariosView({ usuarios }: { usuarios: UsuarioRow[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<UsuarioRow | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const hayFiltros = busqueda || filtroRol || filtroEstado;

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!u.nombre.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      if (filtroRol && u.rol !== filtroRol) return false;
      if (filtroEstado === "activo" && !u.activo) return false;
      if (filtroEstado === "inactivo" && u.activo) return false;
      return true;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroRol("");
    setFiltroEstado("");
  }

  function abrirNuevo() {
    setEditando(null);
    setError(null);
    setAbierto(true);
  }

  function abrirEditar(u: UsuarioRow) {
    setEditando(u);
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

    const password = String(fd.get("password") ?? "").trim();
    const payload: Record<string, unknown> = {
      nombre: String(fd.get("nombre") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      rol: String(fd.get("rol") ?? "cajero"),
    };
    if (password) payload.password = password;
    if (!editando) {
      if (!password) return setError("La contraseña es obligatoria");
    }

    setEnviando(true);
    try {
      const res = editando
        ? await fetch(`/api/usuarios/${editando.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/usuarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(
          res.status === 409
            ? "Ese email ya está registrado"
            : (data.error ?? "No se pudo guardar")
        );
      }
      cancelar();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function toggleActivo(u: UsuarioRow) {
    setToggleError(null);
    try {
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !u.activo }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error al actualizar");
      router.refresh();
    } catch (err) {
      setToggleError((err as Error).message);
    }
  }

  const formKey = editando?.id ?? "nuevo";

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={abierto ? cancelar : abrirNuevo} className={btnPrimary}>
          {abierto ? "Cancelar" : "Nuevo usuario"}
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
          <Field label="Email">
            <input
              name="email"
              type="email"
              required
              defaultValue={editando?.email ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label={editando ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}>
            <input
              name="password"
              type="password"
              minLength={editando ? 0 : 6}
              placeholder={editando ? "••••••  (sin cambios)" : "Mínimo 6 caracteres"}
              className={inputCls}
            />
          </Field>
          <Field label="Rol">
            <select
              name="rol"
              defaultValue={editando?.rol ?? "cajero"}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROL_LABEL[r]}</option>
              ))}
            </select>
          </Field>

          {error && <p className="text-sm text-debt sm:col-span-2">{error}</p>}

          <div className="sm:col-span-2">
            <button type="submit" disabled={enviando} className={btnPrimary}>
              {enviando ? "Guardando…" : editando ? "Actualizar" : "Crear usuario"}
            </button>
          </div>
        </form>
      )}

      {toggleError && <p className="mb-4 text-sm text-debt">{toggleError}</p>}

      {usuarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-sm text-ink/60">
            Aún no hay usuarios. Crea el primero con "Nuevo usuario".
          </p>
        </div>
      ) : (
        <>
          {/* Barra de filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Buscar por nombre o email…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`${filterCls} min-w-[200px] flex-1`}
            />
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className={filterCls}
            >
              <option value="">Todos los roles</option>
              <option value="admin">Admin</option>
              <option value="cajero">Cajero</option>
            </select>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className={filterCls}
            >
              <option value="">Cualquier estado</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
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
              {usuariosFiltrados.length} de {usuarios.length}
            </span>
          </div>

          {usuariosFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
              <p className="text-sm text-ink/60">Sin resultados para los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/50">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Rol</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-b border-line last:border-0 ${!u.activo ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-ink">{u.nombre}</td>
                      <td className="px-4 py-3 text-ink/70">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.rol === "admin"
                              ? "bg-antara/10 text-antara"
                              : "bg-ink/10 text-ink/60"
                          }`}
                        >
                          {ROL_LABEL[u.rol]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleActivo(u)}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                            u.activo
                              ? "bg-paid/10 text-paid hover:bg-paid/20"
                              : "bg-ink/10 text-ink/50 hover:bg-ink/20"
                          }`}
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => abrirEditar(u)}
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
      )}
    </>
  );
}
