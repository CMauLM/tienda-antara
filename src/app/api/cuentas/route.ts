import { NextRequest, NextResponse } from "next/server";
import { crearCuentaSchema } from "@/validators/cuenta";
import { listarCuentas, crearCuenta } from "@/services/cuentas.service";

export async function GET() {
  const cuentas = await listarCuentas();
  return NextResponse.json({ ok: true, cuentas });
}

export async function POST(req: NextRequest) {
  try {
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
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}