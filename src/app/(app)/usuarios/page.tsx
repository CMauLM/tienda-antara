import { PageHeader } from "@/components/layout/PageHeader";
import { listarUsuarios } from "@/services/usuarios.service";
import { UsuariosView } from "@/components/usuarios/UsuariosView";
import { requireSesion } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  await requireSesion(["admin"]);
  const docs = await listarUsuarios();
  const usuarios = docs.map((u) => ({
    id: String(u._id),
    nombre: u.nombre,
    email: u.email,
    rol: u.rol as "admin" | "vendedor" | "abonador",
    activo: u.activo ?? true,
  }));

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Administradores, vendedores y abonadores del sistema"
      />
      <UsuariosView usuarios={usuarios} />
    </>
  );
}
