import { NextResponse } from "next/server";
import { listarMovimientos } from "@/services/movimientos.service";
import { requireRolApi, ApiAuthError } from "@/lib/session";

export async function GET() {
  try {
    await requireRolApi(["admin"]);
    const movimientos = await listarMovimientos();
    return NextResponse.json({ ok: true, movimientos });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}