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
  // "yyyy-mm-dd" del <input type="date">; se valida como string (no
  // z.coerce.date()) para parsearlo luego en horario LOCAL y no desfasar
  // el día por UTC. Opcional: si no viene, el día de consumo es hoy.
  fechaConsumo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de consumo inválida")
    .optional(),
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