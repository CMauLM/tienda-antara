import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verificarToken } from "@/lib/auth";
import type { RolUsuario } from "@/models/Usuario";

// Chequeo optimista de rutas. La autorización real (segunda capa) vive en
// cada Route Handler / página vía requireSesion / requireRolApi — ver
// src/lib/session.ts. No confiar solo en este archivo (recomendación de los
// docs de Next 16 sobre Proxy).

const PUBLICAS = ["/api/auth/login", "/api/health"];

// Prefijo → roles permitidos. Sin entrada = cualquier rol autenticado.
const RUTAS_PROTEGIDAS: { prefix: string; roles: RolUsuario[] }[] = [
  { prefix: "/usuarios", roles: ["admin"] },
  { prefix: "/cuentas", roles: ["admin", "abonador"] },
  { prefix: "/articulos", roles: ["admin", "vendedor"] },
  { prefix: "/api/usuarios", roles: ["admin"] },
  { prefix: "/api/cuentas", roles: ["admin", "abonador"] },
  { prefix: "/api/articulos", roles: ["admin", "vendedor"] },
  { prefix: "/api/movimientos/venta", roles: ["admin", "vendedor"] },
  { prefix: "/api/movimientos/abono", roles: ["admin", "abonador"] },
  // Cualquier otra ruta de movimientos (listado plano, reversa) es solo admin.
  { prefix: "/api/movimientos", roles: ["admin"] },
];

function esApi(pathname: string) {
  return pathname.startsWith("/api/");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sesion = verificarToken(request.cookies.get(COOKIE_NAME)?.value);

  if (pathname === "/login") {
    return sesion ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (!sesion) {
    if (esApi(pathname)) {
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  const regla = RUTAS_PROTEGIDAS.find((r) => pathname.startsWith(r.prefix));
  if (regla && !regla.roles.includes(sesion.rol)) {
    if (esApi(pathname)) {
      return NextResponse.json({ ok: false, error: "No tienes permiso para esta acción" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
