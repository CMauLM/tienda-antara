"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { RolUsuario } from "@/models/Usuario";

interface NavItem {
  href: string;
  label: string;
  roles: RolUsuario[];
}

const NAV: NavItem[] = [
  { href: "/", label: "Panel", roles: ["admin", "vendedor", "abonador"] },
  { href: "/cuentas", label: "Cuentas", roles: ["admin", "abonador"] },
  { href: "/movimientos", label: "Movimientos", roles: ["admin", "vendedor", "abonador"] },
  { href: "/articulos", label: "Artículos", roles: ["admin", "vendedor"] },
  { href: "/usuarios", label: "Usuarios", roles: ["admin"] },
];

const ROL_LABEL: Record<RolUsuario, string> = {
  admin: "Admin",
  vendedor: "Vendedor",
  abonador: "Abonador",
};

export function Sidebar({ usuario }: { usuario: { nombre: string; rol: RolUsuario } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const nav = NAV.filter((item) => item.roles.includes(usuario.rol));

  async function cerrarSesion() {
    setSaliendo(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const brand = (
    <div className="px-3">
      <p className="font-display text-lg font-extrabold uppercase leading-none tracking-wide text-white">
        Antara
      </p>
      <p className="text-[11px] uppercase tracking-[0.25em] text-white/50">
        Tiendita
      </p>
    </div>
  );

  const links = (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {/* La estrella del logo marca la sección activa */}
            <span className={active ? "text-xs text-white" : "text-xs text-transparent"}>
              ★
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const cuenta = (
    <div className="border-t border-white/10 px-3 pt-4">
      <p className="truncate text-sm font-medium text-white">{usuario.nombre}</p>
      <p className="text-xs text-white/50">{ROL_LABEL[usuario.rol]}</p>
      <button
        onClick={cerrarSesion}
        disabled={saliendo}
        className="mt-2 cursor-pointer text-xs text-white/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saliendo ? "Saliendo…" : "Cerrar sesión"}
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior (móvil) */}
      <div className="flex items-center justify-between bg-antara px-4 py-3 md:hidden">
        {brand}
        <button
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer rounded-md p-2"
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          <span className="block h-0.5 w-5 bg-white" />
          <span className="mt-1 block h-0.5 w-5 bg-white" />
          <span className="mt-1 block h-0.5 w-5 bg-white" />
        </button>
      </div>

      {/* Menú desplegable (móvil) */}
      {open && (
        <div className="bg-antara px-4 pb-4 md:hidden">
          {links}
          {cuenta}
        </div>
      )}

      {/* Sidebar (escritorio) */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between gap-6 bg-antara px-3 py-6 md:flex">
        <div className="flex flex-col gap-6">
          {brand}
          {links}
        </div>
        {cuenta}
      </aside>
    </>
  );
}
