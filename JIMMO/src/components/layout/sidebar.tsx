"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  ShoppingCart,
  CreditCard,
  Wallet,
  Truck,
  BarChart3,
  Settings,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { Perfil } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { label: "Pedidos", href: "/pedidos", icon: ShoppingCart, roles: ["admin", "vendedor"] },
  { label: "Clientes", href: "/clientes", icon: Users, roles: ["admin", "vendedor"] },
  { label: "Catálogos", href: "/catalogos", icon: Store, roles: ["admin"] },
  { label: "Inventario", href: "/inventario", icon: Boxes, roles: ["admin", "vendedor"] },
  { label: "Lotes", href: "/lotes", icon: Package, roles: ["admin"] },
  { label: "Pagos", href: "/pagos", icon: CreditCard, roles: ["admin"] },
  { label: "Retiros", href: "/retiros", icon: Wallet, roles: ["admin"] },
  { label: "Entregas", href: "/entregas", icon: Truck, roles: ["admin", "vendedor"] },
  { label: "Reportes", href: "/reportes", icon: BarChart3, roles: ["admin"] },
  { label: "Configuración", href: "/configuracion", icon: Settings, roles: ["admin"] },
] as const;

interface SidebarProps {
  perfil: Perfil;
}

export function Sidebar({ perfil }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("jimmo_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const collapsed = mounted ? isCollapsed : false;

  function toggleSidebar() {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("jimmo_sidebar_collapsed", String(next));
      return next;
    });
  }

  const filtered = navItems.filter((item) =>
    (item.roles as readonly string[]).includes(perfil.rol)
  );

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border select-none transition-all duration-300 relative",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className={cn("pt-5 pb-4 border-b border-sidebar-border transition-all duration-300", collapsed ? "px-3" : "px-5")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black flex items-center justify-center shrink-0 border border-zinc-800 shadow-inner">
              <Image
                src="/jimmo-logo.png"
                alt="Logo JIMMO"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-wider text-white font-heading">
                    JIMMO
                  </span>
                </div>
                <div className="h-0.5 w-14 bg-red-600 rounded-full my-0.5" />
                <p className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase truncate">
                  Mayorista y Detalle
                </p>
              </div>
            )}
          </div>

          {/* Toggle Button */}
          <button
            onClick={toggleSidebar}
            type="button"
            title={collapsed ? "Expandir menú" : "Plegar menú"}
            className="w-8 h-8 rounded-lg bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center shrink-0 transition-colors border border-zinc-800/80 cursor-pointer"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-red-500" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400 capitalize">
              Rol: <span className="text-zinc-200 font-medium">{perfil.rol}</span>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/15 text-red-400 border border-red-600/30 uppercase tracking-wider">
              {perfil.rol}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto" aria-label="Navegación principal">
        {filtered.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.href.replace("/", "")}`}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center px-0" : "px-3",
                isActive
                  ? "bg-zinc-900 text-white font-semibold shadow-sm border-l-2 border-red-600"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-white"
              )}
            >
              <item.icon
                className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-red-500" : "text-zinc-400")}
                aria-hidden="true"
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info footer */}
      {(() => {
        const displayName =
          perfil.nombre && perfil.nombre.trim() !== ""
            ? perfil.nombre
            : perfil.email
            ? perfil.email.split("@")[0]
            : "Usuario";
        const initial = displayName.charAt(0).toUpperCase();

        return (
          <div className={cn("py-3.5 border-t border-sidebar-border bg-black/30 transition-all duration-300", collapsed ? "px-2" : "px-4")}>
            <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
              <div
                className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 border border-zinc-700"
                title={collapsed ? `${displayName} (${perfil.email})` : undefined}
              >
                {initial}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{perfil.email}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </aside>
  );
}
