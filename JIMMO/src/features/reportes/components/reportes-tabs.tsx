"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Landmark, PackageSearch, Users, Boxes, HandCoins } from "lucide-react";

const tabs = [
  { label: "Reporte Financiero", href: "/reportes", icon: Landmark },
  { label: "Rentabilidad por Producto", href: "/reportes/rentabilidad-producto", icon: PackageSearch },
  { label: "Utilidad por Vendedor", href: "/reportes/utilidad-vendedor", icon: Users },
  { label: "Rentabilidad por Lote", href: "/reportes/rentabilidad-lote", icon: Boxes },
  { label: "Utilidad por Inversionista", href: "/reportes/utilidad-inversionista", icon: HandCoins },
];

export function ReportesTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px scrollbar-none">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/reportes"
            ? pathname === "/reportes"
            : pathname.startsWith(tab.href);

        const hrefWithParams = queryString ? `${tab.href}?${queryString}` : tab.href;

        return (
          <Link
            key={tab.href}
            href={hrefWithParams}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap",
              isActive
                ? "border-red-600 text-red-600 bg-red-50/50 dark:bg-red-950/20"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
