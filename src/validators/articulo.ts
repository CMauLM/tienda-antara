import { z } from "zod";

export const crearArticuloSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  categoria: z.enum(["desayuno", "bebida", "snack", "otro"]),
  precio: z.number().int().min(1, "El precio debe ser mayor a 0"), // centavos
});

export const actualizarArticuloSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  categoria: z.enum(["desayuno", "bebida", "snack", "otro"]).optional(),
  precio: z.number().int().min(1).optional(),
  activo: z.boolean().optional(),
});

export type CrearArticuloInput = z.infer<typeof crearArticuloSchema>;
export type ActualizarArticuloInput = z.infer<typeof actualizarArticuloSchema>;
