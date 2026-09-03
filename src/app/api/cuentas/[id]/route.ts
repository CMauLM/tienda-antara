import { NextRequest, NextResponse } from "next/server";
import { actualizarCuentaSchema } from "@/validators/cuenta";
import { actualizarCuenta } from "@/services/cuentas.service";
import { requireRolApi, ApiAuthError } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Solo admin puede editar cuentas (corregir nivel/grado, etc).
    await requireRolApi(["admin"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = actualizarCuentaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const cuenta = await actualizarCuenta(id, parsed.data);
    if (!cuenta) {
      return NextResponse.json(
        { ok: false, error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, cuenta });
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
