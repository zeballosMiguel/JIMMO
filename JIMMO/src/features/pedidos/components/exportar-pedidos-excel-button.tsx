"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  estadoActual?: string;
}

export function ExportarPedidosExcelButton({ estadoActual }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    try {
      setLoading(true);
      const query = estadoActual ? `?estado=${encodeURIComponent(estadoActual)}` : "";
      const res = await fetch(`/api/pedidos/exportar-excel${query}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Error al generar el archivo Excel");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Usar nombre enviado en Content-Disposition si existe, o default
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `reporte_pedidos_${new Date().toISOString().split("T")[0]}.xlsx`;
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Reporte Excel descargado exitosamente");
    } catch (err: any) {
      toast.error(err.message || "No se pudo exportar a Excel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleExport}
      disabled={loading}
      className="gap-2 bg-background hover:bg-muted text-foreground border-border"
      title="Descargar pedidos detallados en Excel"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
      ) : (
        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
      )}
      {loading ? "Exportando..." : "Exportar Excel"}
    </Button>
  );
}
