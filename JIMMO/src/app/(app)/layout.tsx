import { getPerfil } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar perfil={perfil} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header perfil={perfil} />
        <main
          className="flex-1 overflow-y-auto p-6 bg-background"
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
