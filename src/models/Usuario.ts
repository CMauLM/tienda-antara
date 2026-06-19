import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

// Usuarios del SISTEMA (los que hacen login). No confundir con las Cuentas
// (alumnos/empleados que compran a crédito y no se autentican).
export const ROLES_USUARIO = ['admin', 'cajero'] as const;
export type RolUsuario = (typeof ROLES_USUARIO)[number];

const usuarioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // select:false -> no se devuelve en queries por defecto.
    passwordHash: { type: String, required: true, select: false },
    rol: { type: String, enum: ROLES_USUARIO, default: 'cajero', required: true },
    activo: { type: Boolean, default: true }, // soft-delete: desactivar, no borrar
  },
  { timestamps: true }
);

export type Usuario = InferSchemaType<typeof usuarioSchema>;

export const UsuarioModel: Model<Usuario> =
  (models.Usuario as Model<Usuario>) ||
  model<Usuario>('Usuario', usuarioSchema);
