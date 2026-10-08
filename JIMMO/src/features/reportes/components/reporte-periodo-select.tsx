"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReportePeriodoSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentPeriodo = searchParams.get("periodo") || "todo";
  const currentDesde = searchParams.get("desde") || "";
  const currentHasta = searchParams.get("hasta") || "";

  const [periodo, setPeriodo] = useState<string>(currentPeriodo);
  const [showCustom, setShowCustom] = useState<boolean>(currentPeriodo === "custom");
  const [desde, setDesde] = useState<string>(currentDesde);
  const [hasta, setHasta] = useState<string>(currentHasta);

  function applyPeriodo(newPeriodo: string) {
    setPeriodo(newPeriodo);
    if (newPeriodo === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPeriodo === "todo") {
        params.delete("periodo");
        params.delete("desde");
        params.delete("hasta");
      } else {
        params.set("periodo", newPeriodo);
        params.delete("desde");
        params.delete("hasta");
      }
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desde || !hasta) return;

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("periodo", "custom");
      params.set("desde", desde);
      params.set("hasta", hasta);
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-[170px]">
        <Select
          value={periodo}
          onValueChange={(val) => applyPeriodo(val ?? "mes")}
          disabled={isPending}
        >
          <SelectTrigger className="h-9 bg-card border-border shadow-xs text-xs font-semibold">
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Periodo" />
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="todo">Todo el histórico</SelectItem>
            <SelectItem value="mes">Este mes</SelectItem>
            <SelectItem value="hoy">Hoy</SelectItem>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="anio">Este año</SelectItem>
            <SelectItem value="custom">Personalizado 📅</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showCustom && (
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5 bg-card border border-border p-1 rounded-lg">
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="h-7 text-xs w-[130px]"
            required
          />
          <span className="text-xs text-muted-foreground">a</span>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="h-7 text-xs w-[130px]"
            required
          />
          <Button type="submit" size="sm" className="h-7 px-2.5 text-xs">
            Filtrar
          </Button>
        </form>
      )}
    </div>
  );
}
