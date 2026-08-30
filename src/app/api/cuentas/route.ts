import { NextRequest, NextResponse } from "next/server";
import { crearCuentaSchema } from "@/validators/cuenta";
import { listarCuentas, crearCuenta } from "@/services/cuentas.service";
import { requireRolApi, ApiAuthError } from "@/lib/session";

export async function GET() {
  try {
    await requireRolApi(["admin", "abonador"]);
    const cuentas = await listarCuentas();
    return NextResponse.json({ ok: true, cuentas });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRolApi(["admin", "abonador"]);
    const body = await req.json();
    const parsed = crearCuentaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const cuenta = await crearCuenta(parsed.data);
    return NextResponse.json({ ok: true, cuenta }, { status: 201 });
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