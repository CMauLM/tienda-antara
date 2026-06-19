import { NextResponse } from "next/server";
import { listarMovimientos } from "@/services/movimientos.service";

export async function GET() {
  const movimientos = await listarMovimientos();
  return NextResponse.json({ ok: true, movimientos });
}