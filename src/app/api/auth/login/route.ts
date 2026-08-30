import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { UsuarioModel } from "@/models/Usuario";
import { crearToken, COOKIE_NAME } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }

    await dbConnect();
    const usuario = await UsuarioModel.findOne({ email: parsed.data.email.toLowerCase() })
      .select("+passwordHash")
      .lean();

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ ok: false, error: "Email o contraseña incorrectos" }, { status: 401 });
    }

    const coincide = await bcrypt.compare(parsed.data.password, usuario.passwordHash);
    if (!coincide) {
      return NextResponse.json({ ok: false, error: "Email o contraseña incorrectos" }, { status: 401 });
    }

    const token = crearToken({
      sub: String(usuario._id),
      nombre: usuario.nombre,
      rol: usuario.rol,
    });

    const res = NextResponse.json({
      ok: true,
      usuario: { nombre: usuario.nombre, rol: usuario.rol },
    });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
