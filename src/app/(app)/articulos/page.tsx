import { PageHeader } from "@/components/layout/PageHeader";
import { listarArticulos } from "@/services/articulos.service";
import { ArticulosView } from "@/components/articulos/ArticulosView";

export const dynamic = "force-dynamic";

export default async function ArticulosPage() {
  const docs = await listarArticulos(false); // todos, incluso inactivos
  const articulos = docs.map((a) => ({
    id: String(a._id),
    nombre: a.nombre,
    categoria: a.categoria as "desayuno" | "bebida" | "snack" | "otro",
    precio: a.precio,
    activo: a.activo ?? true,
  }));

  return (
    <>
      <PageHeader
        title="Artículos"
        subtitle="Catálogo de la tiendita"
      />
      <ArticulosView articulos={articulos} />
    </>
  );
}
