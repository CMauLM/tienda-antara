import { NextRequest, NextResponse } from "next/server";
import { actualizarUsuarioSchema } from "@/validators/usuario";
import { actualizarUsuario } from "@/services/usuarios.service";
import { requireRolApi, ApiAuthError } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRolApi(["admin"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = actualizarUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const usuario = await actualizarUsuario(id, parsed.data);
    if (!usuario) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, usuario });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const msg = (err as Error).message;
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
