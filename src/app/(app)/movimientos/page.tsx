import { PageHeader } from "@/components/layout/PageHeader";
import { listarCuentas } from "@/services/cuentas.service";
import { listarArticulos } from "@/services/articulos.service";
import { listarMovimientos, listarIdsRevertidos } from "@/services/movimientos.service";
import { MovimientosView } from "@/components/movimientos/MovimientosView";
import { requireSesion } from "@/lib/session";
import { fechaLocalDesdeInput, inputDesdeFechaUTC } from "@/lib/fecha";
import type { TipoMovimiento } from "@/models/Movimiento";

export const dynamic = "force-dynamic";

const TIPOS_VALIDOS = new Set<TipoMovimiento>(["cargo", "abono"]);

const SECCION_LABEL: Record<string, string> = {
  maternal: "Maternal",
  preescolar: "Preescolar",
  primaria: "Primaria",
};

// Texto corto para distinguir cuentas con nombres parecidos en el buscador
// (ej. dos alumnas "Astrid" en secciones/grados distintos).
function describirCuenta(c: { tipo: string; seccion?: string | null; grado?: string | null; grupo?: string | null }) {
  if (c.tipo !== "alumno") return "Empleado";
  const seccion = c.seccion ? SECCION_LABEL[c.seccion] ?? c.seccion : null;
  const grado = c.grado ? `${c.grado}${c.grupo ? " " + c.grupo : ""}` : null;
  return [seccion, grado].filter(Boolean).join(" · ") || undefined;
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sesion = await requireSesion();
  const sp = await searchParams;

  // Un vendedor solo debe ver los cargos (ventas) que él puede registrar;
  // un abonador solo los abonos. Admin ve todo. El rol SIEMPRE manda sobre
  // lo que venga en la URL — nunca confiar en el query string para permisos.
  const tipoVisible = sesion.rol === "vendedor" ? "cargo" : sesion.rol === "abonador" ? "abono" : null;
  const tipoParam = typeof sp.tipo === "string" && TIPOS_VALIDOS.has(sp.tipo as TipoMovimiento)
    ? (sp.tipo as TipoMovimiento)
    : undefined;
  const tipoEfectivo = tipoVisible ?? tipoParam;

  // Rango de fechas: viene de la URL para que cambiarlo dispare una consulta
  // nueva y exacta al servidor (no "los últimos N" recortados en el cliente).
  // Si no se especifica NINGUNO de los dos, el default es "mes actual" — así
  // la vista de entrada sigue siendo rápida y enfocada; un rango explícito
  // (aunque sea de hace meses) no se acota.
  const desdeParam = typeof sp.desde === "string" ? fechaLocalDesdeInput(sp.desde) : null;
  const hastaParam = typeof sp.hasta === "string" ? fechaLocalDesdeInput(sp.hasta) : null;
  const sinFiltroFecha = !desdeParam && !hastaParam;

  // Sobre qué fecha aplica el rango: consumo (default) o captura — para que
  // el admin pueda reconciliar lo tecleado un día dado contra el cuaderno.
  const porFecha = sp.porFecha === "captura" ? "captura" : "consumo";

  // Construidos con getters/Date.UTC, no con hora local del servidor — ver
  // comentario en fechaLocalDesdeInput. inicioMes y el +1 día de "hasta"
  // deben quedar codificados igual que desdeParam/hastaParam (medianoche
  // UTC) para que el rango sea el mismo sin importar en qué huso corra.
  const ahora = new Date();
  const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
  const desde = desdeParam ?? (sinFiltroFecha ? inicioMes : undefined);
  // "hasta" en la UI es el día seleccionado completo (inclusivo) -> +1 día para el $lt de Mongo.
  const hasta = hastaParam
    ? new Date(Date.UTC(hastaParam.getUTCFullYear(), hastaParam.getUTCMonth(), hastaParam.getUTCDate() + 1))
    : undefined;

  const [cuentasDocs, articulosDocs, movimientosDocs, idsRevertidos] = await Promise.all([
    listarCuentas(),
    listarArticulos(),
    listarMovimientos({
      tipo: tipoEfectivo,
      desde,
      hasta,
      campoFecha: porFecha === "captura" ? "fecha" : "fechaConsumo",
    }),
    listarIdsRevertidos(),
  ]);

  const cuentas = cuentasDocs.map((c) => ({
    id: String(c._id),
    nombre: c.nombre,
    detalle: describirCuenta(c),
  }));
  const articulos = articulosDocs.map((a) => ({
    id: String(a._id),
    nombre: a.nombre,
    precio: a.precio,
  }));

  const movimientos = movimientosDocs.map((m) => {
    const cuenta = m.cuenta as unknown as { nombre?: string } | null;
    return {
      id: String(m._id),
      fechaConsumo: new Date((m.fechaConsumo ?? m.fecha) as Date).toISOString(),
      fechaCaptura: new Date(m.fecha as Date).toISOString(),
      cuentaNombre: cuenta?.nombre ?? "—",
      tipo: m.tipo as "cargo" | "abono",
      monto: m.monto,
      metodoPago: (m.metodoPago as "efectivo" | "transferencia" | "otro" | undefined) ?? null,
      esReversa: Boolean(m.reversaDe),
      yaRevertido: idsRevertidos.has(String(m._id)),
      nota: m.nota ?? null,
    };
  });

  return (
    <>
      <PageHeader title="Movimientos" subtitle="Registra ventas y abonos" />
      <MovimientosView
        rol={sesion.rol}
        cuentas={cuentas}
        articulos={articulos}
        movimientos={movimientos}
        filtroInicial={{
          tipo: tipoParam ?? "",
          desde: inputDesdeFechaUTC(desde ?? inicioMes),
          desdeEsDefault: !desdeParam,
          hasta: hastaParam ? inputDesdeFechaUTC(hastaParam) : "",
          porFecha,
        }}
      />
    </>
  );
}
