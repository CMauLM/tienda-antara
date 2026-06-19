import mongoose, { type HydratedDocument } from 'mongoose';
import { dbConnect } from '@/lib/db';
import { CuentaModel } from '@/models/Cuenta';
import { ArticuloModel } from '@/models/Articulo';
import { MovimientoModel, type Movimiento } from '@/models/Movimiento';

type MovimientoDoc = HydratedDocument<Movimiento>;

// ---------- Registrar venta (cargo) ----------

interface LineaVentaInput {
  articuloId: string;
  cantidad: number;
}

interface RegistrarVentaInput {
  cuentaId: string;
  lineas: LineaVentaInput[];
  registradoPor: string;
  nota?: string;
}

export async function registrarVenta(
  input: RegistrarVentaInput
): Promise<MovimientoDoc> {
  await dbConnect();
  const session = await mongoose.startSession();
  let movimiento: MovimientoDoc | undefined;

  try {
    await session.withTransaction(async () => {
      if (!input.lineas.length) throw new Error('La venta no tiene líneas');

      const cuenta = await CuentaModel.findById(input.cuentaId).session(session);
      if (!cuenta || !cuenta.activo) {
        throw new Error('Cuenta no encontrada o inactiva');
      }

      const lineas = [];
      let monto = 0;

      for (const l of input.lineas) {
        if (l.cantidad < 1) throw new Error('Cantidad inválida');

        const articulo = await ArticuloModel.findById(l.articuloId).session(session);
        if (!articulo || !articulo.activo) {
          throw new Error(`Artículo ${l.articuloId} no disponible`);
        }

        // Snapshot del precio al momento de la venta.
        monto += articulo.precio * l.cantidad;
        lineas.push({
          articulo: articulo._id,
          nombre: articulo.nombre,
          cantidad: l.cantidad,
          precioUnitario: articulo.precio,
        });
      }

      // Límite de crédito (saldo positivo = deuda).
      if (
        cuenta.limiteCredito != null &&
        cuenta.saldoActual + monto > cuenta.limiteCredito
      ) {
        throw new Error('La venta excede el límite de crédito de la cuenta');
      }

      const [mov] = await MovimientoModel.create(
        [
          {
            cuenta: cuenta._id,
            tipo: 'cargo',
            monto,
            lineas,
            registradoPor: input.registradoPor,
            nota: input.nota,
          },
        ],
        { session }
      );

      cuenta.saldoActual += monto;
      await cuenta.save({ session });
      movimiento = mov;
    });
  } finally {
    await session.endSession();
  }

  if (!movimiento) throw new Error('No se pudo registrar la venta');
  return movimiento;
}

// ---------- Registrar abono (pago) ----------

interface RegistrarAbonoInput {
  cuentaId: string;
  monto: number; // centavos
  metodoPago: 'efectivo' | 'transferencia' | 'otro';
  referencia?: string;
  registradoPor: string;
  nota?: string;
}

export async function registrarAbono(
  input: RegistrarAbonoInput
): Promise<MovimientoDoc> {
  await dbConnect();
  const session = await mongoose.startSession();
  let movimiento: MovimientoDoc | undefined;

  try {
    await session.withTransaction(async () => {
      if (input.monto <= 0) throw new Error('El monto del abono debe ser mayor a 0');

      const cuenta = await CuentaModel.findById(input.cuentaId).session(session);
      if (!cuenta || !cuenta.activo) {
        throw new Error('Cuenta no encontrada o inactiva');
      }

      const [mov] = await MovimientoModel.create(
        [
          {
            cuenta: cuenta._id,
            tipo: 'abono',
            monto: input.monto,
            metodoPago: input.metodoPago,
            referencia: input.referencia,
            registradoPor: input.registradoPor,
            nota: input.nota,
          },
        ],
        { session }
      );

      // Permite saldo negativo (saldo a favor / prepago).
      cuenta.saldoActual -= input.monto;
      await cuenta.save({ session });
      movimiento = mov;
    });
  } finally {
    await session.endSession();
  }

  if (!movimiento) throw new Error('No se pudo registrar el abono');
  return movimiento;
}

// ---------- Reversar movimiento (anular) ----------

interface ReversarInput {
  movimientoId: string;
  registradoPor: string;
  nota?: string;
}

export async function reversarMovimiento(
  input: ReversarInput
): Promise<MovimientoDoc> {
  await dbConnect();
  const session = await mongoose.startSession();
  let reversa: MovimientoDoc | undefined;

  try {
    await session.withTransaction(async () => {
      const original = await MovimientoModel.findById(input.movimientoId).session(session);
      if (!original) throw new Error('Movimiento no encontrado');
      if (original.reversaDe) throw new Error('No se puede revertir una reversa');

      const yaReversado = await MovimientoModel.exists({
        reversaDe: original._id,
      }).session(session);
      if (yaReversado) throw new Error('El movimiento ya fue revertido');

      const cuenta = await CuentaModel.findById(original.cuenta).session(session);
      if (!cuenta) throw new Error('Cuenta no encontrada');

      // Ledger append-only: la reversa es un movimiento de tipo contrario.
      const tipoReversa = original.tipo === 'cargo' ? 'abono' : 'cargo';

      const [rev] = await MovimientoModel.create(
        [
          {
            cuenta: original.cuenta,
            tipo: tipoReversa,
            monto: original.monto,
            reversaDe: original._id,
            registradoPor: input.registradoPor,
            nota: input.nota ?? `Reversa de ${original._id.toString()}`,
          },
        ],
        { session }
      );

      if (original.tipo === 'cargo') {
        cuenta.saldoActual -= original.monto;
      } else {
        cuenta.saldoActual += original.monto;
      }

      await cuenta.save({ session });
      reversa = rev;
    });
  } finally {
    await session.endSession();
  }

  if (!reversa) throw new Error('No se pudo reversar el movimiento');
  return reversa;
}

// ---------- Listado para la UI (recientes, DESC) ----------
export async function listarMovimientos(cuentaId?: string, limit = 50) {
  await dbConnect();
  const filtro = cuentaId ? { cuenta: cuentaId } : {};
  return MovimientoModel.find(filtro)
    .sort({ fecha: -1 })
    .limit(limit)
    .populate('cuenta', 'nombre')
    .lean();
}

// ---------- Ledger de una cuenta (ASC, para saldo corriente) ----------
export async function listarMovimientosCuenta(cuentaId: string) {
  await dbConnect();
  return MovimientoModel.find({ cuenta: cuentaId })
    .sort({ fecha: 1 })
    .lean();
}
