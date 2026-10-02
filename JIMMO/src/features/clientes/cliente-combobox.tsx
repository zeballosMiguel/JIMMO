"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, X, Check, Phone, MapPin, Plus } from "lucide-react";
import { NuevoClienteInlineDialog } from "./nuevo-cliente-inline-dialog";

export interface ClienteOption {
  id: string;
  nombre: string;
  telefono?: string | null;
  ciudad?: string | null;
}

interface ClienteComboboxProps {
  clientes: ClienteOption[];
  value: string;
  onChange: (clienteId: string) => void;
  onClienteCreado?: (nuevo: ClienteOption) => void;
  placeholder?: string;
}

export function ClienteCombobox({
  clientes,
  value,
  onChange,
  onClienteCreado,
  placeholder = "Buscar cliente por nombre o teléfono...",
}: ClienteComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCliente = clientes.find((c) => c.id === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter clients based on query (by name, phone, or city)
  const filteredClientes = clientes.filter((c) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const matchName = c.nombre?.toLowerCase().includes(q);
    const matchPhone = c.telefono?.toLowerCase().includes(q);
    const matchCity = c.ciudad?.toLowerCase().includes(q);
    return matchName || matchPhone || matchCity;
  });

  function handleSelect(clienteId: string) {
    onChange(clienteId);
    setOpen(false);
    setQuery("");
  }

  function handleClear() {
    onChange("");
    setQuery("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  return (
    <div ref={containerRef} className="relative w-full space-y-1">
      {/* If a client is selected, show selected card with clear button */}
      {selectedCliente ? (
        <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {selectedCliente.nombre}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                {selectedCliente.telefono && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {selectedCliente.telefono}
                  </span>
                )}
                {selectedCliente.ciudad && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {selectedCliente.ciudad}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="text-xs h-7 text-primary hover:text-primary hover:bg-primary/10"
            >
              Cambiar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Quitar cliente seleccionado"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-9 pr-8 bg-background"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown list of matching clients */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto p-1.5 space-y-1 backdrop-blur-md">
          <div className="flex items-center justify-between px-2.5 py-1 text-xs text-muted-foreground border-b border-border/50">
            <span>
              {filteredClientes.length} {filteredClientes.length === 1 ? "cliente encontrado" : "clientes encontrados"}
            </span>
            {onClienteCreado && (
              <NuevoClienteInlineDialog
                onClienteCreado={(nuevo) => {
                  onClienteCreado(nuevo);
                  handleSelect(nuevo.id);
                }}
              />
            )}
          </div>

          {filteredClientes.length === 0 ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                No se encontró ningún cliente que coincida con &quot;{query}&quot;.
              </p>
              {onClienteCreado && (
                <NuevoClienteInlineDialog
                  onClienteCreado={(nuevo) => {
                    onClienteCreado(nuevo);
                    handleSelect(nuevo.id);
                  }}
                />
              )}
            </div>
          ) : (
            filteredClientes.map((c) => {
              const isSelected = c.id === value;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.nombre}</p>
                      {(c.telefono || c.ciudad) && (
                        <p className={`text-xs truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {c.telefono ? `Tel: ${c.telefono}` : ""}
                          {c.telefono && c.ciudad ? " • " : ""}
                          {c.ciudad ? c.ciudad : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
