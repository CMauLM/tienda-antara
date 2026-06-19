import { NextRequest, NextResponse } from "next/server";
import { reversarMovimiento } from "@/services/movimientos.service";
import { getUsuarioActualId } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const nota: string | undefined =
      typeof body?.nota === "string" && body.nota.trim() ? body.nota.trim() : undefined;

    const registradoPor = await getUsuarioActualId();
    const reversa = await reversarMovimiento({ movimientoId: id, registradoPor, nota });
    return NextResponse.json({ ok: true, reversa }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
