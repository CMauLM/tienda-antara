// Corrige `fechaConsumo` en movimientos que NUNCA tuvieron una fecha de
// consumo elegida a propósito: los que ya existían antes de este campo
// (backfill-fecha-consumo.mjs los copió tal cual de `fecha`, instante real
// con hora) y los nuevos que se registraron sin tocar el selector de fecha
// (el default del esquema también es Date.now(), un instante con hora).
//
// Esos valores NO son medianoche UTC exacta — a diferencia de una fecha de
// consumo elegida a propósito, que siempre lo es (ver fechaLocalDesdeInput
// en src/lib/fecha.ts). Esa es la señal para distinguir "nunca se eligió"
// de "sí se elgió": se corrige solo si fechaConsumo no cae justo en
// medianoche UTC.
//
// La corrección: se recalcula a partir de `fecha` (el instante real de
// captura), tomando el día de calendario que ESE instante representa en
// México (America/Mexico_City) — no en UTC ni en la zona del servidor — y
// se guarda como medianoche UTC de ese día, igual que una fecha de consumo
// elegida a propósito. Es la misma idea que ya se mostraba en pantalla
// antes del fix de zona horaria, solo que ahora queda fija en la base en
// vez de depender de la zona del navegador al mostrarla.
//
// Idempotente: una vez corregido, fechaConsumo queda en medianoche UTC
// exacta, así que correrlo otra vez no lo vuelve a tocar.
//
// Uso:
//   npm run corrige-fecha-consumo-legado                  (usa MONGODB_URI_TEST si DB_ENV=test)
//   CONFIRM_PROD=yes npm run corrige-fecha-consumo-legado  (para correrlo en producción)

import { readFileSync } from "fs";
import path from "path";
import mongoose from "mongoose";

const ROOT = process.cwd();
const usarTest = process.env.DB_ENV === "test";
const ZONA_TIENDA = "America/Mexico_City";

function leerVariable(nombre) {
  const env = readFileSync(path.join(ROOT, ".env.local"), "utf8");
  const match = env.match(new RegExp(`^${nombre}\\s*=\\s*"?([^"\\n\\r]+)"?`, "m"));
  if (!match) throw new Error(`No se encontró ${nombre} en .env.local`);
  return match[1];
}

function resolverUri() {
  const uri = usarTest ? leerVariable("MONGODB_URI_TEST") : leerVariable("MONGODB_URI");

  if (!usarTest && process.env.CONFIRM_PROD !== "yes") {
    throw new Error(
      "🚫 Esto correría contra PRODUCCIÓN (MONGODB_URI, sin DB_ENV=test). " +
        "Si de verdad quieres correrlo ahí, vuelve a ejecutarlo con " +
        "CONFIRM_PROD=yes como variable de entorno.",
    );
  }

  return uri;
}

function esMedianocheUTC(d) {
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

const formateadorMx = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_TIENDA });

function diaConsumoDesdeFecha(fecha) {
  const [y, m, d] = formateadorMx.format(fecha).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

async function main() {
  const uri = resolverUri();
  await mongoose.connect(uri);
  const nombreDb = mongoose.connection.db.databaseName;
  console.log(`Conectado a "${nombreDb}" (${usarTest ? "PRUEBAS" : "PRODUCCIÓN — confirmado"}).`);

  const movimientos = mongoose.connection.db.collection("movimientos");

  const total = await movimientos.countDocuments({});
  console.log(`Movimientos en total: ${total}`);

  const cursor = movimientos.find({}, { projection: { fecha: 1, fechaConsumo: 1 } });
  let revisados = 0;
  let corregidos = 0;

  for await (const doc of cursor) {
    revisados++;
    if (!doc.fechaConsumo || esMedianocheUTC(doc.fechaConsumo)) continue; // ya es una fecha de consumo elegida a propósito

    const nuevaFechaConsumo = diaConsumoDesdeFecha(doc.fecha);
    await movimientos.updateOne({ _id: doc._id }, { $set: { fechaConsumo: nuevaFechaConsumo } });
    corregidos++;
  }

  console.log(`Revisados: ${revisados}. Corregidos: ${corregidos}.`);
  if (corregidos === 0) console.log("Nada que corregir (ya estaba todo en medianoche UTC).");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
