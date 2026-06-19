import { Sidebar } from "@/components/layout/Sidebar";

// Shell autenticado. El guard de sesión se agrega aquí cuando montemos el login.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:flex md:min-h-screen">
      <Sidebar />
      <main className="flex-1 px-5 py-7 md:px-10">{children}</main>
    </div>
  );
}