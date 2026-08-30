import { Sidebar } from "@/components/layout/Sidebar";
import { requireSesion } from "@/lib/session";

// Shell autenticado. El guard "duro" por rol vive en cada página (requireSesion);
// aquí solo se exige que haya sesión, para poder mostrar nombre/rol en el Sidebar.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await requireSesion();

  return (
    <div className="md:flex md:min-h-screen">
      <Sidebar usuario={sesion} />
      <main className="flex-1 px-5 py-7 md:px-10">{children}</main>
    </div>
  );
}