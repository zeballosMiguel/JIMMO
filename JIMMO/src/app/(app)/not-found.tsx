import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground">
        <FileQuestion className="w-8 h-8" />
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">404</h1>
      <h2 className="text-lg font-semibold text-foreground mt-1">Página no encontrada</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        La ruta que intentas consultar no existe o ha sido movida.
      </p>

      <Link
        href="/dashboard"
        className={buttonVariants({ className: "mt-6 gap-2" })}
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al Dashboard
      </Link>
    </div>
  );
}
