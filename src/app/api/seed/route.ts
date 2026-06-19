import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { toCentavos, formatMXN } from '@/lib/money';
import { UsuarioModel } from '@/models/Usuario';
import { CuentaModel } from '@/models/Cuenta';
import { ArticuloModel } from '@/models/Articulo';
import { MovimientoModel } from '@/models/Movimiento';
import {
  registrarVenta,
  registrarAbono,
  reversarMovimiento,
} from '@/services/movimientos.service';

// SOLO PARA DESARROLLO. Borra e inserta datos de prueba.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Deshabilitado en producción' }, { status: 403 });
  }

  try {
    await dbConnect();

    // 1. Limpiar
    await Promise.all([
      UsuarioModel.deleteMany({}),
      CuentaModel.deleteMany({}),
      ArticuloModel.deleteMany({}),
      MovimientoModel.deleteMany({}),
    ]);

    // 2. Usuario admin (passwordHash es placeholder hasta implementar auth)
    const admin = await UsuarioModel.create({
      nombre: 'Admin Antara',
      email: 'admin@antara.mx',
      passwordHash: 'placeholder-cambiar-al-implementar-auth',
      rol: 'admin',
    });

    // 3. Artículos de comida (precios en centavos)
    const [desayuno, refresco, snack] = await ArticuloModel.create([
      { nombre: 'Desayuno completo', categoria: 'desayuno', precio: toCentavos(25) },
      { nombre: 'Refresco 600ml', categoria: 'bebida', precio: toCentavos(15) },
      { nombre: 'Papas fritas', categoria: 'snack', precio: toCentavos(10) },
    ]);

    // 4. Cuentas
    const alumno = await CuentaModel.create({
      nombre: 'Juan Pérez',
      tipo: 'alumno',
      grado: '5',
      grupo: 'A',
      responsable: { nombre: 'María Pérez', telefono: '9841234567' },
    });
    const empleado = await CuentaModel.create({
      nombre: 'Laura Gómez',
      tipo: 'empleado',
    });

    const adminId = admin._id.toString();

    // 5. Demo cuenta alumno: venta + abono parcial
    await registrarVenta({
      cuentaId: alumno._id.toString(),
      registradoPor: adminId,
      lineas: [
        { articuloId: desayuno._id.toString(), cantidad: 1 }, // $25
        { articuloId: refresco._id.toString(), cantidad: 1 }, // $15  => total $40
      ],
    });
    await registrarAbono({
      cuentaId: alumno._id.toString(),
      monto: toCentavos(30),
      metodoPago: 'efectivo',
      registradoPor: adminId,
    });

    // 6. Demo cuenta empleado: venta y luego reversa (saldo vuelve a 0)
    const ventaEmpleado = await registrarVenta({
      cuentaId: empleado._id.toString(),
      registradoPor: adminId,
      lineas: [{ articuloId: snack._id.toString(), cantidad: 2 }], // $20
    });
    await reversarMovimiento({
      movimientoId: ventaEmpleado._id.toString(),
      registradoPor: adminId,
      nota: 'Demo de reversa',
    });

    // 7. Leer estado final
    const cuentas = await CuentaModel.find().lean();
    const totalMovs = await MovimientoModel.countDocuments();

    return NextResponse.json({
      ok: true,
      resumen: {
        cuentas: cuentas.map((c) => ({
          nombre: c.nombre,
          tipo: c.tipo,
          saldo: formatMXN(c.saldoActual ?? 0),
        })),
        totalMovimientos: totalMovs,
      },
      esperado: {
        'Juan Pérez': 'saldo $10.00 (venta $40 - abono $30)',
        'Laura Gómez': 'saldo $0.00 (venta $20 revertida)',
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
