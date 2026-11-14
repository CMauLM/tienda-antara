import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireRolApi, ApiAuthError } from "@/lib/session";
import { obtenerCuenta } from "@/services/cuentas.service";
import { listarMovimientosCuenta } from "@/services/movimientos.service";
import {
  construirLedger,
  filtrarYOrdenarLedger,
  recortarDesdeUltimoCero,
  type FiltroLedger,
} from "@/lib/ledger";
import { EstadoCuentaPDF } from "@/components/cuentas/EstadoCuentaPDF";

// @react-pdf/renderer necesita Node (no Edge).
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRolApi(["admin", "abonador"]);
    const { id } = await params;
    const sp = request.nextUrl.searchParams;

    const cuentaDoc = await obtenerCuenta(id);
    if (!cuentaDoc) {
      return NextResponse.json({ ok: false, error: "Cuenta no encontrada" }, { status: 404 });
    }

    const movimientosDocs = await listarMovimientosCuenta(id);
    const ledgerCompleto = construirLedger(movimientosDocs);

    // Mismos query params que construye CuentaDetalleView — el PDF
    // descarga exactamente el recorte que el admin tenía en pantalla.
    const historialCompleto = sp.get("historial") === "completo";
    const ledgerBase = historialCompleto
      ? ledgerCompleto
      : recortarDesdeUltimoCero(ledgerCompleto);

    const tipoParam = sp.get("tipo");
    const filtro: FiltroLedger = {
      tipo: tipoParam === "cargo" || tipoParam === "abono" ? tipoParam : "",
      fechaDesde: sp.get("desde") ?? "",
      fechaHasta: sp.get("hasta") ?? "",
      criterioFecha: sp.get("criterio") === "captura" ? "captura" : "consumo",
      ordenAsc: sp.get("orden") !== "desc",
    };
    const ledger = filtrarYOrdenarLedger(ledgerBase, filtro);

    const cuenta = {
      nombre: cuentaDoc.nombre,
      tipo: cuentaDoc.tipo as string,
      grado: cuentaDoc.grado ?? null,
      grupo: cuentaDoc.grupo ?? null,
      saldoActual: cuentaDoc.saldoActual ?? 0,
    };

    const buffer = await renderToBuffer(
      <EstadoCuentaPDF
        cuenta={cuenta}
        ledger={ledger}
        filtro={filtro}
        historialCompleto={historialCompleto}
      />
    );

    const nombreArchivo = `estado-cuenta-${cuenta.nombre.replace(/[^a-zA-Z0-9]+/g, "-")}.pdf`;

    return new NextResponse(new Blob([new Uint8Array(buffer)]), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      },
    });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
