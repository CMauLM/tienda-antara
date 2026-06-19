import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

export const CATEGORIAS_ARTICULO = ['desayuno', 'bebida', 'snack', 'otro'] as const;
export type CategoriaArticulo = (typeof CATEGORIAS_ARTICULO)[number];

const articuloSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    categoria: { type: String, enum: CATEGORIAS_ARTICULO, required: true },
    precio: { type: Number, required: true, min: 0 }, // centavos
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type Articulo = InferSchemaType<typeof articuloSchema>;

export const ArticuloModel: Model<Articulo> =
  (models.Articulo as Model<Articulo>) ||
  model<Articulo>('Articulo', articuloSchema);
