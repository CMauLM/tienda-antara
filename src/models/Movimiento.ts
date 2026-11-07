import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

// EL LEDGER. Fuente de verdad del saldo. Append-only: nunca se edita ni borra.
export const TIPOS_MOVIMIENTO = ['cargo', 'abono'] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];
//  cargo  -> venta (la cuenta debe más)
//  abono  -> pago del responsable (la cuenta debe menos)

export const METODOS_PAGO = ['efectivo', 'transferencia', 'otro'] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

// Línea de venta: SNAPSHOT del artículo al momento de la venta. Precio y costo
// se congelan aquí; si después cambia el precio del artículo, el histórico no
// se altera.
const lineaSchema = new Schema(
  {
    articulo: { type: Schema.Types.ObjectId, ref: 'Articulo', required: true },
    nombre: { type: String, required: true },                 // snapshot
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true, min: 0 },  // centavos, snapshot
  },
  { _id: false }
);

const movimientoSchema = new Schema(
  {
    cuenta: {
      type: Schema.Types.ObjectId,
      ref: 'Cuenta',
      required: true,
      index: true,
    },
    tipo: { type: String, enum: TIPOS_MOVIMIENTO, required: true },

    // Monto total en centavos. cargo = suma de líneas; abono = monto del pago.
    monto: { type: Number, required: true, min: 0 },

    // Solo para 'cargo'
    lineas: { type: [lineaSchema], default: undefined },

    // Solo para 'abono'
    metodoPago: { type: String, enum: METODOS_PAGO },
    referencia: { type: String, trim: true },

    // Anulación = se crea un movimiento de efecto contrario que apunta al
    // original vía reversaDe. El original nunca se toca.
    reversaDe: {
      type: Schema.Types.ObjectId,
      ref: 'Movimiento',
      default: null,
    },

    // Auditoría
    registradoPor: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    nota: { type: String, trim: true },

    // Cuándo se CAPTURÓ el movimiento en el sistema (el operador anota en
    // papel y el admin lo teclea 1-2 días después; esta fecha es la del
    // tecleo, no la del consumo real).
    fecha: { type: Date, default: Date.now },

    // Cuándo se CONSUMIÓ realmente (solo tiene sentido para 'cargo'; para
    // 'abono'/reversas coincide con `fecha`, no hay "consumo" que fechar).
    // El estado de cuenta y el corte de caja se ordenan/filtran por ESTA
    // fecha, no por `fecha`, para que coincida con lo que el padre de
    // familia recuerda haber consumido.
    fechaConsumo: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Estados de cuenta: movimientos de una cuenta ordenados por fecha de consumo.
movimientoSchema.index({ cuenta: 1, fechaConsumo: -1 });

export type Movimiento = InferSchemaType<typeof movimientoSchema>;

export const MovimientoModel: Model<Movimiento> =
  (models.Movimiento as Model<Movimiento>) ||
  model<Movimiento>('Movimiento', movimientoSchema);
