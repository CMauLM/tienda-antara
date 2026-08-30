// Resetea la contraseña de un usuario del sistema (no hay flujo de "olvidé mi
// contraseña" todavía; esto sirve mientras tanto).
//
// Uso: npm run reset-password -- correo@ejemplo.com nuevaPassword

import { readFileSync } from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const ROOT = process.cwd();

function leerMongoUri() {
  const env = readFileSync(path.join(ROOT, ".env.local"), "utf8");
  const match = env.match(/^MONGODB_URI\s*=\s*"?([^"\n\r]+)"?/m);
  if (!match) throw new Error("No se encontró MONGODB_URI en .env.local");
  return match[1];
}

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Uso: npm run reset-password -- correo@ejemplo.com nuevaPassword");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("La contraseña debe tener al menos 6 caracteres");
    process.exit(1);
  }

  const uri = leerMongoUri();
  await mongoose.connect(uri);
  const usuarios = mongoose.connection.db.collection("usuarios");

  const passwordHash = await bcrypt.hash(password, 10);
  const res = await usuarios.updateOne(
    { email: email.toLowerCase() },
    { $set: { passwordHash }, $currentDate: { updatedAt: true } }
  );

  if (res.matchedCount === 0) {
    console.error(`No se encontró ningún usuario con email ${email}`);
    process.exitCode = 1;
  } else {
    console.log(`Contraseña actualizada para ${email}.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
