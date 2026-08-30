import { createHmac, timingSafeEqual } from "crypto";
import type { RolUsuario } from "@/models/Usuario";

// Sesión stateless: cookie firmada con HMAC (sin librerías nuevas).
// El payload NUNCA debe llevar datos sensibles (password, teléfono, etc).
export const COOKIE_NAME = "antara_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface SesionPayload {
  sub: string; // usuarioId
  nombre: string;
  rol: RolUsuario;
  exp: number; // epoch ms
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Falta SESSION_SECRET en el entorno");
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function crearToken(datos: { sub: string; nombre: string; rol: RolUsuario }): string {
  const payload: SesionPayload = { ...datos, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const firma = sign(body);
  return `${body}.${firma}`;
}

export function verificarToken(token: string | undefined | null): SesionPayload | null {
  if (!token) return null;
  const [body, firma] = token.split(".");
  if (!body || !firma) return null;

  const firmaEsperada = sign(body);
  const a = Buffer.from(firma);
  const b = Buffer.from(firmaEsperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SesionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
