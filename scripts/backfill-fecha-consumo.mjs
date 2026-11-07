// Rellena `fechaConsumo` en los movimientos que ya existían ANTES de que ese
// campo se agregara al esquema (src/models/Movimiento.ts) — sin esto, un
// `sort({ fechaConsumo: ... })` trataría esos documentos viejos como "sin
// fecha" y rompería el orden del estado de cuenta / corte de caja.
//
// Para cada movimiento sin `fechaConsumo`, lo copia de `fecha` (su mejor
// aproximación: antes de este cambio ambas fechas eran, de hecho, la misma
// cosa). Idempotente: si ya se corrió, correrlo otra vez no modifica nada.
//
// Uso:
//   npm run backfill-fecha-consumo              (usa MONGODB_URI_TEST si DB_ENV=test)
//   CONFIRM_PROD=yes npm run backfill-fecha-consumo   (para correrlo en producción)

import { readFileSync } from "fs";
import path from "path";
import mongoose from "mongoose";

const ROOT = process.cwd();
const usarTest = process.env.DB_ENV === "test";

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

async function main() {
  const uri = resolverUri();
  await mongoose.connect(uri);
  const nombreDb = mongoose.connection.db.databaseName;
  console.log(`Conectado a "${nombreDb}" (${usarTest ? "PRUEBAS" : "PRODUCCIÓN — confirmado"}).`);

  const movimientos = mongoose.connection.db.collection("movimientos");

  const faltantes = await movimientos.countDocuments({ fechaConsumo: { $exists: false } });
  console.log(`Movimientos sin fechaConsumo: ${faltantes}`);

  if (faltantes === 0) {
    console.log("Nada que hacer.");
  } else {
    const res = await movimientos.updateMany({ fechaConsumo: { $exists: false } }, [
      { $set: { fechaConsumo: "$fecha" } },
    ]);
    console.log(`Actualizados: ${res.modifiedCount}.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
