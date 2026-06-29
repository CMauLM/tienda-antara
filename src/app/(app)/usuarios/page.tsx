import { PageHeader } from "@/components/layout/PageHeader";
import { listarUsuarios } from "@/services/usuarios.service";
import { UsuariosView } from "@/components/usuarios/UsuariosView";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const docs = await listarUsuarios();
  const usuarios = docs.map((u) => ({
    id: String(u._id),
    nombre: u.nombre,
    email: u.email,
    rol: u.rol as "admin" | "cajero",
    activo: u.activo ?? true,
  }));

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Administradores y cajeros del sistema"
      />
      <UsuariosView usuarios={usuarios} />
    </>
  );
}
