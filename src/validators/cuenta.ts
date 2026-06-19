import { z } from "zod";

export const crearCuentaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  tipo: z.enum(["alumno", "empleado"]),
  grado: z.string().trim().optional(),
  grupo: z.string().trim().optional(),
  responsable: z
    .object({
      nombre: z.string().trim().optional(),
      telefono: z.string().trim().optional(),
    })
    .optional(),
  limiteCredito: z.number().int().min(0).nullable().optional(), // centavos
});

export type CrearCuentaInput = z.infer<typeof crearCuentaSchema>;