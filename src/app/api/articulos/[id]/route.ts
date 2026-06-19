import { NextRequest, NextResponse } from "next/server";
import { actualizarArticuloSchema } from "@/validators/articulo";
import { actualizarArticulo } from "@/services/articulos.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = actualizarArticuloSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const articulo = await actualizarArticulo(id, parsed.data);
    if (!articulo) {
      return NextResponse.json(
        { ok: false, error: "Artículo no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, articulo });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
