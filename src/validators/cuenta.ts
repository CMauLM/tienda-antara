import { z } from "zod";

export const crearCuentaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  tipo: z.enum(["alumno", "empleado"]),
  seccion: z.enum(["maternal", "preescolar", "primaria"]).optional(),
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

export const actualizarCuentaSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  tipo: z.enum(["alumno", "empleado"]).optional(),
  seccion: z.enum(["maternal", "preescolar", "primaria"]).optional(),
  grado: z.string().trim().optional(),
  grupo: z.string().trim().optional(),
  responsable: z
    .object({
      nombre: z.string().trim().optional(),
      telefono: z.string().trim().optional(),
    })
    .optional(),
  limiteCredito: z.number().int().min(0).nullable().optional(),
});

export type CrearCuentaInput = z.infer<typeof crearCuentaSchema>;
export type ActualizarCuentaInput = z.infer<typeof actualizarCuentaSchema>;