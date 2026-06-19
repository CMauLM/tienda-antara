import { NextRequest, NextResponse } from "next/server";
import { crearArticuloSchema } from "@/validators/articulo";
import { listarArticulos, crearArticulo } from "@/services/articulos.service";

export async function GET() {
  try {
    const articulos = await listarArticulos(false);
    return NextResponse.json({ ok: true, articulos });
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
    const parsed = crearArticuloSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const articulo = await crearArticulo(parsed.data);
    return NextResponse.json({ ok: true, articulo }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
