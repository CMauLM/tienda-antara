import { dbConnect } from "@/lib/db";
import { CuentaModel } from "@/models/Cuenta";
import type { CrearCuentaInput, ActualizarCuentaInput } from "@/validators/cuenta";

export async function listarCuentas() {
  await dbConnect();
  return CuentaModel.find({ activo: true }).sort({ nombre: 1 }).lean();
}

export async function obtenerCuenta(id: string) {
  await dbConnect();
  return CuentaModel.findById(id).lean();
}

export async function crearCuenta(input: CrearCuentaInput) {
  await dbConnect();
  return CuentaModel.create(input);
}

export async function actualizarCuenta(id: string, input: ActualizarCuentaInput) {
  await dbConnect();
  return CuentaModel.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true,
  }).lean();
}