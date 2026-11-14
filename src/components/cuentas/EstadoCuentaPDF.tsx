import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatMXN } from "@/lib/money";
import { ZONA_TIENDA, inputDesdeFechaUTC, diaEnZonaTienda } from "@/lib/fecha";
import type { LedgerRow, FiltroLedger } from "@/lib/ledger";

// Este componente corre SOLO en el servidor (lo renderiza la ruta de la
// API con renderToBuffer) — no hay navegador, así que cada fecha fija su
// zona horaria explícitamente en vez de depender de una TZ "ambiente":
// fechaConsumo es un día-calendario puro codificado en UTC (igual que en
// pantalla), fechaCaptura es un instante real y su día es el que vivió el
// admin en México.
const fmtFechaConsumo = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const fmtFechaCaptura = new Intl.DateTimeFormat("es-MX", {
  timeZone: ZONA_TIENDA,
  day: "2-digit",
  month: "short",
});
const fmtHoraCaptura = new Intl.DateTimeFormat("es-MX", {
  timeZone: ZONA_TIENDA,
  hour: "2-digit",
  minute: "2-digit",
});
const fmtGeneracion = new Intl.DateTimeFormat("es-MX", {
  timeZone: ZONA_TIENDA,
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtRangoDia = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function diaConsumo(iso: string) {
  return fmtFechaConsumo.format(new Date(iso));
}
function diaYHoraCaptura(iso: string) {
  const d = new Date(iso);
  return `${fmtFechaCaptura.format(d)} ${fmtHoraCaptura.format(d)}`;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: "#1a1c2e", fontFamily: "Helvetica" },
  marca: { fontSize: 11, fontWeight: 700, color: "#1b2c8f" },
  subtitulo: { fontSize: 9, color: "#1a1c2e99", marginTop: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  nombreCuenta: { fontSize: 16, fontWeight: 700, marginTop: 10 },
  detalleCuenta: { fontSize: 9, color: "#1a1c2e99", marginTop: 2 },
  rangoCubierto: { fontSize: 9, color: "#1a1c2e99", marginTop: 6 },
  generado: { fontSize: 8, color: "#1a1c2e66", textAlign: "right" },

  saldoBox: {
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 6,
    backgroundColor: "#f7f8fc",
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saldoLabel: { fontSize: 9, color: "#1a1c2e99" },
  saldoMonto: { fontSize: 18, fontWeight: 700 },
  saldoNota: { fontSize: 8, color: "#1a1c2e99", marginTop: 1 },

  tabla: { borderTopWidth: 1, borderTopColor: "#e4e7f2" },
  filaHeader: {
    flexDirection: "row",
    backgroundColor: "#f7f8fc",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  fila: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e7f2",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  thFecha: { width: "16%", fontWeight: 700, color: "#1a1c2e99", fontSize: 8, textTransform: "uppercase" },
  thDetalle: { width: "42%", fontWeight: 700, color: "#1a1c2e99", fontSize: 8, textTransform: "uppercase" },
  thMonto: { width: "14%", fontWeight: 700, color: "#1a1c2e99", fontSize: 8, textTransform: "uppercase", textAlign: "right" },
  thSaldo: { width: "14%", fontWeight: 700, color: "#1a1c2e99", fontSize: 8, textTransform: "uppercase", textAlign: "right" },

  celdaFecha: { width: "16%" },
  celdaDetalle: { width: "42%", paddingRight: 6 },
  celdaCargo: { width: "14%", textAlign: "right" },
  celdaAbono: { width: "14%", textAlign: "right" },
  celdaSaldo: { width: "14%", textAlign: "right", fontWeight: 700 },

  fechaPrincipal: { fontSize: 9 },
  fechaNota: { fontSize: 7, color: "#1a1c2e66", marginTop: 1 },
  lineaProducto: { fontSize: 9 },
  notaMovimiento: { fontSize: 7, color: "#1a1c2e66", marginTop: 1 },
  badgeReversa: { fontSize: 8, color: "#1a1c2e66" },

  vacio: { padding: 24, textAlign: "center", color: "#1a1c2e66", fontSize: 9 },

  footer: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e4e7f2",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
  },
  footerBloque: { alignItems: "flex-end" },
  footerLabel: { fontSize: 8, color: "#1a1c2e99" },
  footerMonto: { fontSize: 11, fontWeight: 700, marginTop: 1 },
});

function colorSaldo(saldo: number) {
  if (saldo > 0) return "#d1435b";
  if (saldo < 0) return "#1f9d6b";
  return "#1a1c2e66";
}

function descripcionRango(filtro: FiltroLedger, historialCompleto: boolean): string {
  const partes: string[] = [];
  if (filtro.fechaDesde && filtro.fechaHasta) {
    partes.push(`Del ${fmtRangoDia.format(new Date(`${filtro.fechaDesde}T00:00:00Z`))} al ${fmtRangoDia.format(new Date(`${filtro.fechaHasta}T00:00:00Z`))}`);
  } else if (filtro.fechaDesde) {
    partes.push(`Desde ${fmtRangoDia.format(new Date(`${filtro.fechaDesde}T00:00:00Z`))}`);
  } else if (filtro.fechaHasta) {
    partes.push(`Hasta ${fmtRangoDia.format(new Date(`${filtro.fechaHasta}T00:00:00Z`))}`);
  } else {
    // Por default se omite lo ya saldado (ver recortarDesdeUltimoCero en
    // src/lib/ledger.ts) — el padre que ya pagó todo no necesita ver
    // compras de hace meses, solo lo que sigue pendiente ahora.
    partes.push(historialCompleto ? "Historial completo" : "Saldo pendiente (sin movimientos ya saldados)");
  }
  if (filtro.criterioFecha === "captura") partes.push("filtrado por fecha de captura");
  if (filtro.tipo === "cargo") partes.push("solo cargos (ventas)");
  if (filtro.tipo === "abono") partes.push("solo abonos (pagos)");
  return partes.join(" · ");
}

function Detalle({ row }: { row: LedgerRow }) {
  if (row.esReversa) {
    return (
      <View style={styles.celdaDetalle}>
        <Text style={styles.badgeReversa}>
          {row.tipo === "abono" ? "Reversa de venta" : "Reversa de abono"}
        </Text>
        {row.nota && <Text style={styles.notaMovimiento}>{row.nota}</Text>}
      </View>
    );
  }
  if (row.tipo === "cargo") {
    return (
      <View style={styles.celdaDetalle}>
        {row.lineas.length > 0 ? (
          row.lineas.map((l, i) => (
            <Text key={i} style={styles.lineaProducto}>
              {l.nombre} ×{l.cantidad}
            </Text>
          ))
        ) : (
          <Text style={styles.lineaProducto}>Venta</Text>
        )}
        {row.nota && <Text style={styles.notaMovimiento}>{row.nota}</Text>}
      </View>
    );
  }
  const metodo = row.metodoPago
    ? { efectivo: "Efectivo", transferencia: "Transferencia", otro: "Otro" }[row.metodoPago] ?? row.metodoPago
    : null;
  return (
    <View style={styles.celdaDetalle}>
      <Text style={styles.lineaProducto}>{metodo ? `Abono (${metodo})` : "Abono"}</Text>
      {row.nota && <Text style={styles.notaMovimiento}>{row.nota}</Text>}
    </View>
  );
}

export function EstadoCuentaPDF({
  cuenta,
  ledger,
  filtro,
  historialCompleto,
}: {
  cuenta: { nombre: string; tipo: string; grado: string | null; grupo: string | null; saldoActual: number };
  ledger: LedgerRow[];
  filtro: FiltroLedger;
  historialCompleto: boolean;
}) {
  const totalCargos = ledger.reduce((s, r) => (r.tipo === "cargo" && !r.esReversa ? s + r.monto : s), 0);
  const totalAbonos = ledger.reduce((s, r) => (r.tipo === "abono" && !r.esReversa ? s + r.monto : s), 0);
  // Mismo texto que ya muestra CuentaDetalleView.tsx en pantalla.
  const detalleCuenta =
    cuenta.tipo === "alumno"
      ? `Alumno${cuenta.grado ? ` · ${cuenta.grado}${cuenta.grupo ? " " + cuenta.grupo : ""}` : ""}`
      : "Empleado";

  return (
    <Document title={`Estado de cuenta - ${cuenta.nombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.marca}>Antara</Text>
            <Text style={styles.subtitulo}>Estado de cuenta</Text>
          </View>
          <Text style={styles.generado}>Generado el {fmtGeneracion.format(new Date())}</Text>
        </View>

        <Text style={styles.nombreCuenta}>{cuenta.nombre}</Text>
        <Text style={styles.detalleCuenta}>{detalleCuenta}</Text>
        <Text style={styles.rangoCubierto}>{descripcionRango(filtro, historialCompleto)}</Text>

        <View style={styles.saldoBox}>
          <View>
            <Text style={styles.saldoLabel}>Saldo actual</Text>
            <Text style={styles.saldoNota}>
              {cuenta.saldoActual > 0 ? "Debe" : cuenta.saldoActual < 0 ? "Saldo a favor" : "Sin adeudo"}
            </Text>
          </View>
          <Text style={[styles.saldoMonto, { color: colorSaldo(cuenta.saldoActual) }]}>
            {formatMXN(cuenta.saldoActual)}
          </Text>
        </View>

        <View style={styles.tabla}>
          <View style={styles.filaHeader}>
            <Text style={styles.thFecha}>Fecha</Text>
            <Text style={styles.thDetalle}>Detalle</Text>
            <Text style={styles.thMonto}>Cargo</Text>
            <Text style={styles.thMonto}>Abono</Text>
            <Text style={styles.thSaldo}>Saldo</Text>
          </View>

          {ledger.length === 0 ? (
            <Text style={styles.vacio}>Sin movimientos para este rango.</Text>
          ) : (
            ledger.map((row) => {
              const difiere =
                inputDesdeFechaUTC(new Date(row.fechaConsumo)) !== diaEnZonaTienda(new Date(row.fechaCaptura));
              return (
                <View key={row.id} style={styles.fila} wrap={false}>
                  <View style={styles.celdaFecha}>
                    <Text style={styles.fechaPrincipal}>{diaConsumo(row.fechaConsumo)}</Text>
                    {difiere && (
                      <Text style={styles.fechaNota}>capturado {diaYHoraCaptura(row.fechaCaptura)}</Text>
                    )}
                  </View>
                  <Detalle row={row} />
                  {/* Una reversa se pinta en gris apagado, no en rojo/verde
                      vivo — aunque su monto caiga en la columna Cargo o
                      Abono, no es una venta ni un pago real (no cuenta en
                      los totales del pie), y debe VERSE distinta para no
                      confundirse con uno. */}
                  <Text style={[styles.celdaCargo, { color: row.esReversa ? "#1a1c2e66" : "#d1435b" }]}>
                    {row.tipo === "cargo" ? formatMXN(row.monto) : ""}
                  </Text>
                  <Text style={[styles.celdaAbono, { color: row.esReversa ? "#1a1c2e66" : "#1f9d6b" }]}>
                    {row.tipo === "abono" ? formatMXN(row.monto) : ""}
                  </Text>
                  <Text style={[styles.celdaSaldo, { color: colorSaldo(row.saldoCorriente) }]}>
                    {formatMXN(row.saldoCorriente)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerBloque}>
            <Text style={styles.footerLabel}>Total cargos</Text>
            <Text style={[styles.footerMonto, { color: "#d1435b" }]}>{formatMXN(totalCargos)}</Text>
          </View>
          <View style={styles.footerBloque}>
            <Text style={styles.footerLabel}>Total abonos</Text>
            <Text style={[styles.footerMonto, { color: "#1f9d6b" }]}>{formatMXN(totalAbonos)}</Text>
          </View>
          <View style={styles.footerBloque}>
            <Text style={styles.footerLabel}>Saldo final</Text>
            <Text style={[styles.footerMonto, { color: colorSaldo(cuenta.saldoActual) }]}>
              {formatMXN(cuenta.saldoActual)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
