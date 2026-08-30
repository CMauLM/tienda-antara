import { NextRequest, NextResponse } from "next/server";
import { actualizarArticuloSchema } from "@/validators/articulo";
import { actualizarArticulo } from "@/services/articulos.service";
import { requireRolApi, ApiAuthError } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRolApi(["admin", "vendedor"]);
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
    if (err instanceof ApiAuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
