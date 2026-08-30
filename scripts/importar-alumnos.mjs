// Importa los alumnos reales de "Excel de Alumnado.xlsx" como Cuentas tipo
// "alumno". Solo toma nombre, sección (NIVEL) y grado (GRUPO tal cual, sin
// separar la letra). Es un upsert por nombre: se puede re-correr en otro
// ciclo escolar sin duplicar cuentas.
//
// Uso: npm run importar-alumnos

import { readFileSync } from "fs";
import path from "path";
import mongoose from "mongoose";
import XLSX from "xlsx";

const ROOT = process.cwd();
const EXCEL_PATH = path.join(ROOT, "Excel de Alumnado.xlsx");
const HOJA = "2026-2027";

const SECCIONES_VALIDAS = new Set(["maternal", "preescolar", "primaria"]);

function leerMongoUri() {
  const env = readFileSync(path.join(ROOT, ".env.local"), "utf8");
  const match = env.match(/^MONGODB_URI\s*=\s*"?([^"\n\r]+)"?/m);
  if (!match) throw new Error("No se encontró MONGODB_URI en .env.local");
  return match[1];
}

function aTitleCase(nombre) {
  return nombre
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(" ");
}

function leerAlumnos() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[HOJA];
  if (!ws) throw new Error(`No se encontró la hoja "${HOJA}" en el Excel`);

  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const [, ...datos] = filas; // saltar encabezado

  const alumnos = [];
  for (const fila of datos) {
    const nombreCrudo = String(fila[1] ?? "").trim();
    if (!nombreCrudo) continue; // fila vacía

    const nivelCrudo = String(fila[3] ?? "").trim().toLowerCase();
    const grado = String(fila[4] ?? "").trim() || undefined;

    alumnos.push({
      nombre: aTitleCase(nombreCrudo),
      seccion: SECCIONES_VALIDAS.has(nivelCrudo) ? nivelCrudo : undefined,
      grado,
    });
  }
  return alumnos;
}

async function main() {
  const uri = leerMongoUri();
  const alumnos = leerAlumnos();
  console.log(`Leídos ${alumnos.length} alumnos del Excel.`);

  await mongoose.connect(uri);
  const cuentas = mongoose.connection.db.collection("cuentas");

  let insertados = 0;
  let actualizados = 0;
  const porSeccion = {};

  for (const a of alumnos) {
    const set = { tipo: "alumno" };
    if (a.seccion) set.seccion = a.seccion;
    if (a.grado) set.grado = a.grado;

    const res = await cuentas.updateOne(
      { nombre: a.nombre, tipo: "alumno" },
      {
        $set: set,
        $setOnInsert: {
          nombre: a.nombre,
          activo: true,
          saldoActual: 0,
          limiteCredito: null,
          createdAt: new Date(),
        },
        $currentDate: { updatedAt: true },
      },
      { upsert: true }
    );

    if (res.upsertedCount > 0) insertados++;
    else actualizados++;

    const key = a.seccion ?? "sin sección";
    porSeccion[key] = (porSeccion[key] ?? 0) + 1;
  }

  console.log(`Insertados: ${insertados}`);
  console.log(`Actualizados (ya existían): ${actualizados}`);
  console.log("Por sección:", porSeccion);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
