"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Panel" },
  { href: "/cuentas", label: "Cuentas" },
  { href: "/movimientos", label: "Movimientos" },
  { href: "/articulos", label: "Artículos" },
  { href: "/usuarios", label: "Usuarios" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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
      {NAV.map((item) => {
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

  return (
    <>
      {/* Barra superior (móvil) */}
      <div className="flex items-center justify-between bg-antara px-4 py-3 md:hidden">
        {brand}
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2"
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
        <div className="bg-antara px-4 pb-4 md:hidden">{links}</div>
      )}

      {/* Sidebar (escritorio) */}
      <aside className="hidden w-60 shrink-0 flex-col gap-6 bg-antara px-3 py-6 md:flex">
        {brand}
        {links}
      </aside>
    </>
  );
}