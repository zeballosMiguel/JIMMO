"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to error monitoring service if needed
    console.error("App boundary error caught:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-foreground">Ocurrió un error inesperado</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        {error.message || "No se pudo cargar esta sección. Por favor, intenta de nuevo."}
      </p>

      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono mt-2 bg-muted px-2 py-1 rounded">
          Código de referencia: {error.digest}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </Button>
      </div>
    </div>
  );
}
