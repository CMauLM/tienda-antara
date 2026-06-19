import { dbConnect } from "@/lib/db";
import { ArticuloModel } from "@/models/Articulo";
import type { CrearArticuloInput, ActualizarArticuloInput } from "@/validators/articulo";

export async function listarArticulos(soloActivos = true) {
  await dbConnect();
  const filtro = soloActivos ? { activo: true } : {};
  return ArticuloModel.find(filtro).sort({ nombre: 1 }).lean();
}

export async function obtenerArticulo(id: string) {
  await dbConnect();
  return ArticuloModel.findById(id).lean();
}

export async function crearArticulo(input: CrearArticuloInput) {
  await dbConnect();
  return ArticuloModel.create(input);
}

export async function actualizarArticulo(id: string, input: ActualizarArticuloInput) {
  await dbConnect();
  return ArticuloModel.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true,
  }).lean();
}
