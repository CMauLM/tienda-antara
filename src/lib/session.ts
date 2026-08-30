import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verificarToken } from "@/lib/auth";
import type { RolUsuario } from "@/models/Usuario";

export interface Sesion {
  id: string;
  nombre: string;
  rol: RolUsuario;
}

// Chequeo optimista: solo lee/verifica la cookie, sin ir a la base de datos.
export async function getSesion(): Promise<Sesion | null> {
  const cookieStore = await cookies();
  const payload = verificarToken(cookieStore.get(COOKIE_NAME)?.value);
  if (!payload) return null;
  return { id: payload.sub, nombre: payload.nombre, rol: payload.rol };
}

// Para Server Components (páginas): redirige si no hay sesión o el rol no está permitido.
export async function requireSesion(rolesPermitidos?: RolUsuario[]): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (rolesPermitidos && !rolesPermitidos.includes(sesion.rol)) redirect("/");
  return sesion;
}

export class ApiAuthError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

// Para Route Handlers: lanza ApiAuthError (401/403) en vez de redirigir.
export async function requireRolApi(rolesPermitidos?: RolUsuario[]): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) throw new ApiAuthError(401, "No autenticado");
  if (rolesPermitidos && !rolesPermitidos.includes(sesion.rol)) {
    throw new ApiAuthError(403, "No tienes permiso para esta acción");
  }
  return sesion;
}
