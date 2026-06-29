import { NextRequest, NextResponse } from "next/server";
import { crearUsuarioSchema } from "@/validators/usuario";
import { listarUsuarios, crearUsuario } from "@/services/usuarios.service";

export async function GET() {
  try {
    const usuarios = await listarUsuarios();
    return NextResponse.json({ ok: true, usuarios });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = crearUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const usuario = await crearUsuario(parsed.data);
    return NextResponse.json({ ok: true, usuario }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
