import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

// Titular de una cuenta a crédito. Una cuenta = un alumno (o empleado).
export const TIPOS_CUENTA = ['alumno', 'empleado'] as const;
export type TipoCuenta = (typeof TIPOS_CUENTA)[number];

const cuentaSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    tipo: { type: String, enum: TIPOS_CUENTA, required: true },

    // Solo aplica a alumnos
    grado: { type: String, trim: true },
    grupo: { type: String, trim: true },

    // Contacto del responsable (padre/tutor) que abona. Opcional para empleados.
    responsable: {
      nombre: { type: String, trim: true },
      telefono: { type: String, trim: true },
    },

    // Límite de crédito en centavos. null = sin límite.
    limiteCredito: { type: Number, default: null, min: 0 },

    // SALDO DERIVADO del ledger de Movimientos. Se mantiene dentro de la misma
    // transacción al crear/revertir un movimiento; NUNCA se edita desde la UI.
    // Es un cache para listados rápidos y se puede recalcular desde Movimiento.
    // Positivo = la cuenta debe dinero a la tienda.
    saldoActual: { type: Number, default: 0 },

    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type Cuenta = InferSchemaType<typeof cuentaSchema>;

export const CuentaModel: Model<Cuenta> =
  (models.Cuenta as Model<Cuenta>) || model<Cuenta>('Cuenta', cuentaSchema);
