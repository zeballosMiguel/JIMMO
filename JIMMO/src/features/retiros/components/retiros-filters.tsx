"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface Persona {
  id: string;
  nombre: string;
  tipo: "inversionista" | "vendedor";
}

interface RetirosFiltersProps {
  personas: Persona[];
}

export function RetirosFilters({ personas }: RetirosFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const origen = searchParams.get("origen") ?? "";
  const persona = searchParams.get("persona") ?? "";
  const buscar = searchParams.get("buscar") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/retiros?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearAll = () => {
    router.push("/retiros");
  };

  const hasFilters = desde || hasta || origen || persona || buscar;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Filtros de Búsqueda
          </h2>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-red-600 gap-1"
          >
            <X className="w-3 h-3" /> Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Desde */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground font-medium">Desde</Label>
          <Input
            type="date"
            value={desde}
            onChange={(e) => updateParams({ desde: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        {/* Hasta */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground font-medium">Hasta</Label>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => updateParams({ hasta: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        {/* Origen */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground font-medium">Origen</Label>
          <Select
            value={origen || "all"}
            onValueChange={(val) => updateParams({ origen: !val || val === "all" ? "" : val })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos los orígenes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los orígenes</SelectItem>
              <SelectItem value="CAPITAL">Capital</SelectItem>
              <SelectItem value="UTILIDAD">Utilidad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Destinatario / Persona */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground font-medium">
            Destinatario / Persona
          </Label>
          <Select
            value={persona || "all"}
            onValueChange={(val) => updateParams({ persona: !val || val === "all" ? "" : val })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas las personas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las personas</SelectItem>
              {personas.map((p) => (
                <SelectItem key={`${p.tipo}-${p.id}`} value={`${p.tipo}:${p.id}`}>
                  {p.nombre} <span className="text-muted-foreground ml-1">({p.tipo === "inversionista" ? "Inv." : "Vend."})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Buscar */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground font-medium">
            Buscar concepto / descripción
          </Label>
          <Input
            type="text"
            placeholder="Buscar por detalle, motivo, etc."
            value={buscar}
            onChange={(e) => updateParams({ buscar: e.target.value })}
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
