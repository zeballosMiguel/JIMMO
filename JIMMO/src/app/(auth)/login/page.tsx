import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/features/auth/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Brand Header with Official Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-black p-2 flex items-center justify-center shadow-xl border border-zinc-800">
            <Image
              src="/jimmo-logo.png"
              alt="JIMMO Mayorista y Detalle"
              width={100}
              height={100}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950">
                JIMMO
              </h1>
            </div>
            {/* Barra roja distintiva */}
            <div className="h-1 w-24 bg-red-600 rounded-full mx-auto my-1.5" />
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Mayorista y Detalle
            </p>
          </div>
          <p className="text-sm text-zinc-600 max-w-xs">
            Sistema administrativo de ventas, inventario y logística
          </p>
        </div>

        {/* Card de Inicio de Sesión */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm space-y-5">
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-lg font-bold text-zinc-900">
              Iniciar sesión
            </h2>
            <p className="text-xs text-zinc-500">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>
          <LoginForm />
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-zinc-400">
          JIMMO &copy; {new Date().getFullYear()} • Plataforma de Gestión Empresarial
        </p>
      </div>
    </main>
  );
}
