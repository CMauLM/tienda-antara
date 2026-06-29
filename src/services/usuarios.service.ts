import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { UsuarioModel } from "@/models/Usuario";
import type { CrearUsuarioInput, ActualizarUsuarioInput } from "@/validators/usuario";

export async function listarUsuarios() {
  await dbConnect();
  return UsuarioModel.find().sort({ nombre: 1 }).lean();
}

export async function crearUsuario(input: CrearUsuarioInput) {
  await dbConnect();
  const passwordHash = await bcrypt.hash(input.password, 10);
  return UsuarioModel.create({
    nombre: input.nombre,
    email: input.email.toLowerCase(),
    passwordHash,
    rol: input.rol,
  });
}

export async function actualizarUsuario(id: string, input: ActualizarUsuarioInput) {
  await dbConnect();
  const { password, ...rest } = input;
  const update: Record<string, unknown> = { ...rest };

  if (password) {
    update.passwordHash = await bcrypt.hash(password, 10);
  }
  if (rest.email) {
    update.email = rest.email.toLowerCase();
  }

  return UsuarioModel.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).lean();
}
