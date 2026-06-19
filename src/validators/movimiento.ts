import { z } from "zod";

export const registrarVentaSchema = z.object({
  cuentaId: z.string().min(1, "Selecciona una cuenta"),
  lineas: z
    .array(
      z.object({
        articuloId: z.string().min(1),
        cantidad: z.number().int().min(1),
      })
    )
    .min(1, "Agrega al menos un producto"),
  nota: z.string().trim().optional(),
});

export const registrarAbonoSchema = z.object({
  cuentaId: z.string().min(1, "Selecciona una cuenta"),
  monto: z.number().int().min(1, "El monto debe ser mayor a 0"), // centavos
  metodoPago: z.enum(["efectivo", "transferencia", "otro"]),
  referencia: z.string().trim().optional(),
  nota: z.string().trim().optional(),
});

export type RegistrarVentaInput = z.infer<typeof registrarVentaSchema>;
export type RegistrarAbonoInput = z.infer<typeof registrarAbonoSchema>;