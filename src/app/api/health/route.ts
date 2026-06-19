import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';

export async function GET() {
  try {
    const conn = await dbConnect();
    return NextResponse.json({
      ok: true,
      estado: conn.connection.readyState, // 1 = conectado
      db: conn.connection.name,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}