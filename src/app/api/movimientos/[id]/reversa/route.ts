import { NextRequest, NextResponse } from "next/server";
import { reversarMovimiento } from "@/services/movimientos.service";
import { requireRolApi, ApiAuthError } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sesion = await requireRolApi(["admin"]);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const nota: string | undefined =
      typeof body?.nota === "string" && body.nota.trim() ? body.nota.trim() : undefined;

    const reversa = await reversarMovimiento({ movimientoId: id, registradoPor: sesion.id, nota });
    return NextResponse.json({ ok: true, reversa }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
