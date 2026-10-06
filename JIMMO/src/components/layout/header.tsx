"use client";

import { signOut } from "@/features/auth/actions";
import type { Perfil } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck, User } from "lucide-react";

interface HeaderProps {
  perfil: Perfil;
}

export function Header({ perfil }: HeaderProps) {
  const displayName =
    perfil.nombre && perfil.nombre.trim() !== ""
      ? perfil.nombre
      : perfil.email
      ? perfil.email.split("@")[0]
      : "Usuario";

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-normal">Panel de Control</span>
          <span className="text-muted-foreground/40 font-light">•</span>
          <span className="font-semibold text-foreground">{displayName}</span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 capitalize">
          {perfil.rol === "admin" ? (
            <>
              <ShieldCheck className="w-3 h-3 text-red-600" />
              Administrador
            </>
          ) : (
            <>
              <User className="w-3 h-3 text-zinc-600" />
              Vendedor
            </>
          )}
        </span>
      </div>
      
      <form action={signOut}>
        <Button
          variant="outline"
          size="sm"
          type="submit"
          id="logout-button"
          className="gap-2 text-xs font-medium border-border hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </Button>
      </form>
    </header>
  );
}
