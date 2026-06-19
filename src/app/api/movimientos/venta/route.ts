import { NextRequest, NextResponse } from "next/server";
import { registrarVentaSchema } from "@/validators/movimiento";
import { registrarVenta } from "@/services/movimientos.service";
import { getUsuarioActualId } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registrarVentaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const registradoPor = await getUsuarioActualId();
    const movimiento = await registrarVenta({ ...parsed.data, registradoPor });
    return NextResponse.json({ ok: true, movimiento }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}