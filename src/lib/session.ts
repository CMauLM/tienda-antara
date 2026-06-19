import { dbConnect } from "@/lib/db";
import { UsuarioModel } from "@/models/Usuario";

// TEMPORAL: hasta implementar auth, usa el primer admin como registrador.
// Reemplazar por la sesión real cuando montemos login.
export async function getUsuarioActualId(): Promise<string> {
  await dbConnect();
  const admin = await UsuarioModel.findOne({ rol: "admin" }).select("_id").lean();
  if (!admin) throw new Error("No hay usuario admin. Corre /api/seed primero.");
  return String(admin._id);
}