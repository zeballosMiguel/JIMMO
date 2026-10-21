"use client";

import { useState, useTransition, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Plus, Check, ChevronDown, ChevronUp, AlertCircle, Loader2 } from "lucide-react";
import { crearVarianteDirecta } from "@/features/catalogos/actions";
import type { VarianteOption, ProductoLoteInfo } from "./lote-contar-workstation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: ProductoLoteInfo | null;
  catalogoProductos: { id: string; nombre: string; codigo_interno: string }[];
  variantesCatalogo: VarianteOption[]; // Todas las variantes de catálogo de este producto
  conteosActuales: Record<string, number>; // { [varianteId]: cantidad }
  onAgregarVariantes: (items: { variante: VarianteOption; cantidad: number }[]) => void;
}

export function AgregarVariantesLoteDialog({
  open,
  onOpenChange,
  producto,
  catalogoProductos,
  variantesCatalogo,
  conteosActuales,
  onAgregarVariantes,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Búsqueda en catálogo
  const [search, setSearch] = useState("");

  // Cantidades a agregar por variante seleccionada: { [varianteId]: string }
  const [cantidadesToAdd, setCantidadesToAdd] = useState<Record<string, string>>({});

  // Control para el formulario desplegable de "Crear nueva variante"
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [nuevoColor, setNuevoColor] = useState("");
  const [nuevaTalla, setNuevaTalla] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState("1");

  // Código interno resuelto del producto
  const resolvedCodigo = useMemo(() => {
    if (!producto) return "";
    if (producto.codigo_interno && producto.codigo_interno.trim()) {
      return producto.codigo_interno.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    }
    const cat = catalogoProductos.find(
      (c) => String(c.id).toLowerCase() === String(producto.id).toLowerCase()
    );
    if (cat?.codigo_interno && cat.codigo_interno.trim()) {
      return cat.codigo_interno.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    }
    return (producto.nombre || "PRD").slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }, [producto, catalogoProductos]);

  // Limpiar campos al abrir/cerrar
  function handleClose() {
    onOpenChange(false);
    setSearch("");
    setCantidadesToAdd({});
    setIsCreatingNew(false);
    setNuevoColor("");
    setNuevaTalla("");
    setNuevaCantidad("1");
  }

  // Filtrar variantes del catálogo para el producto activo
  const variantesFiltradas = useMemo(() => {
    if (!producto?.id) return [];
    const term = search.trim().toLowerCase();
    return variantesCatalogo
      .filter((v) => {
        const matchesProd = String(v.producto_id || "").toLowerCase() === String(producto.id).toLowerCase();
        if (!matchesProd) return false;
        if (!term) return true;
        const colorMatch = (v.color || "").toLowerCase().includes(term);
        const tallaMatch = (v.talla || "").toLowerCase().includes(term);
        const skuMatch = (v.sku || "").toLowerCase().includes(term);
        return colorMatch || tallaMatch || skuMatch;
      })
      .sort((a, b) => {
        // Ordenar primero las que NO están en conteo todavía
        const aEnConteo = (conteosActuales[a.id] || 0) > 0;
        const bEnConteo = (conteosActuales[b.id] || 0) > 0;
        if (aEnConteo && !bEnConteo) return 1;
        if (!aEnConteo && bEnConteo) return -1;
        return (a.color || "").localeCompare(b.color || "");
      });
  }, [producto, search, variantesCatalogo, conteosActuales]);

  // Total de prendas y variantes listas para agregar
  const resumenSeleccion = useMemo(() => {
    let numVariantes = 0;
    let totalPrendas = 0;
    const items: { variante: VarianteOption; cantidad: number }[] = [];

    for (const [varId, valStr] of Object.entries(cantidadesToAdd)) {
      const parsed = parseInt(valStr, 10);
      if (!isNaN(parsed) && parsed > 0) {
        const variante = variantesCatalogo.find((v) => v.id === varId);
        if (variante) {
          numVariantes += 1;
          totalPrendas += parsed;
          items.push({ variante, cantidad: parsed });
        }
      }
    }

    return { numVariantes, totalPrendas, items };
  }, [cantidadesToAdd, variantesCatalogo]);

  // Manejar cambio de cantidad para una fila
  function handleCantidadChange(varId: string, val: string) {
    setCantidadesToAdd((prev) => ({
      ...prev,
      [varId]: val,
    }));
  }

  // Confirmar y agregar al conteo
  function handleConfirmarAgregar() {
    if (resumenSeleccion.items.length === 0) {
      toast.error("Ingresa la cantidad a contar en al menos una variante.");
      return;
    }

    onAgregarVariantes(resumenSeleccion.items);
    toast.success(
      `Se agregaron ${resumenSeleccion.totalPrendas} prendas (${resumenSeleccion.numVariantes} variantes) a la lista de conteo.`
    );
    handleClose();
  }

  // Previsualización de SKU para nueva variante
  const previewSkuNueva = useMemo(() => {
    if (!nuevoColor.trim()) return "";
    const colorAbbr = nuevoColor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase();
    const tallaAbbr = nuevaTalla.trim()
      ? nuevaTalla
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 4)
          .toUpperCase()
      : "UNI";
    return `${resolvedCodigo}-${colorAbbr}-${tallaAbbr}`;
  }, [nuevoColor, nuevaTalla, resolvedCodigo]);

  // Crear variante directamente en la DB con validación anti-duplicados
  function handleCrearNuevaVariante() {
    if (!producto?.id) {
      toast.error("Producto no identificado.");
      return;
    }
    if (!nuevoColor.trim()) {
      toast.error("Ingresa el color de la variante.");
      return;
    }

    const colorNormalizado = nuevoColor.trim().toLowerCase();
    const tallaFinal = nuevaTalla.trim() || "UNICA";
    const tallaNormalizada = tallaFinal.toLowerCase();

    // Verificación preventiva en catálogo local
    const existeEnCatalogo = variantesCatalogo.find(
      (v) =>
        String(v.producto_id || "").toLowerCase() === String(producto.id).toLowerCase() &&
        (v.color || "").trim().toLowerCase() === colorNormalizado &&
        ((v.talla || "").trim().toLowerCase() === tallaNormalizada ||
          (!v.talla && (tallaFinal === "UNICA" || tallaFinal === "")))
    );

    if (existeEnCatalogo) {
      toast.warning(
        `Esta variante ("${existeEnCatalogo.color} / ${existeEnCatalogo.talla || "UNICA"}") ya existe en catálogo. Selecciona su fila arriba e ingresa la cantidad.`
      );
      // Enfocar y auto-llenar la cantidad en la variante ya existente
      setCantidadesToAdd((prev) => ({
        ...prev,
        [existeEnCatalogo.id]: nuevaCantidad || "1",
      }));
      setSearch(existeEnCatalogo.color);
      setIsCreatingNew(false);
      return;
    }

    const cantNum = Math.max(1, parseInt(nuevaCantidad, 10) || 1);

    startTransition(async () => {
      const res = await crearVarianteDirecta({
        producto_id: producto.id,
        color: nuevoColor.trim(),
        talla: tallaFinal,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      const varianteDb = res.variante!;
      const nuevaVariante: VarianteOption = {
        id: varianteDb.id,
        color: varianteDb.color || nuevoColor.trim(),
        talla: varianteDb.talla || tallaFinal,
        sku: varianteDb.sku || previewSkuNueva,
        producto_id: varianteDb.producto_id || producto.id,
        productos: {
          id: producto.id,
          nombre: producto.nombre,
          codigo_interno: resolvedCodigo,
        },
      };

      // Inyectar directamente a la lista de conteo y cerrar
      onAgregarVariantes([{ variante: nuevaVariante, cantidad: cantNum }]);
      toast.success(
        `Variante creada y agregada: "${nuevaVariante.color} / ${nuevaVariante.talla}" (${cantNum} uds)`
      );
      handleClose();
    });
  }

  if (!producto) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Encabezado */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Agregar Variantes al Conteo</span>
                {resolvedCodigo && (
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0">
                    {resolvedCodigo}
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{producto.nombre}</span> · Selecciona del catálogo o crea una nueva
              </p>
            </div>
          </div>

          {/* Buscador en vivo */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por color, talla o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
              autoFocus
            />
          </div>
        </DialogHeader>

        {/* Cuerpo de variantes del catálogo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Variantes del Catálogo ({variantesFiltradas.length})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Ingresa la cantidad física a contar
            </span>
          </div>

          {variantesFiltradas.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground space-y-2 border border-dashed rounded-xl bg-muted/10">
              <AlertCircle className="w-8 h-8 mx-auto opacity-40 text-primary" />
              <p className="text-xs font-medium">
                {search.trim()
                  ? `No se encontraron variantes que coincidan con "${search}"`
                  : "Este producto no tiene variantes previas en catálogo."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreatingNew(true);
                  if (search.trim()) setNuevoColor(search.trim());
                }}
                className="text-xs h-7 gap-1 text-primary hover:text-primary"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear esta variante ahora
              </Button>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden bg-background divide-y divide-border/60">
              {/* Header de la mini-tabla */}
              <div className="bg-muted/40 px-3.5 py-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span className="w-2/5">Color / Talla</span>
                <span className="w-1/4">SKU</span>
                <span className="w-1/3 text-right">Cant. a Contar</span>
              </div>

              {/* Filas de variantes */}
              {variantesFiltradas.map((v) => {
                const enConteoCant = conteosActuales[v.id] || 0;
                const yaEstaEnConteo = enConteoCant > 0;
                const cantStr = cantidadesToAdd[v.id] ?? "";
                const cantNum = parseInt(cantStr, 10);
                const isSelected = !isNaN(cantNum) && cantNum > 0;

                return (
                  <div
                    key={v.id}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-l-4 border-primary"
                        : yaEstaEnConteo
                        ? "bg-muted/15 opacity-80"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Color y Talla */}
                    <div className="w-2/5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-foreground capitalize truncate">
                          {v.color}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {v.talla || "UNICA"}
                        </span>
                        {yaEstaEnConteo && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] font-medium px-1.5 py-0 h-4 bg-muted text-muted-foreground"
                          >
                            ✓ {enConteoCant} en lista
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* SKU */}
                    <div className="w-1/4 min-w-0">
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40 truncate block">
                        {v.sku || `${resolvedCodigo}-${v.color.slice(0, 3).toUpperCase()}`}
                      </span>
                    </div>

                    {/* Input de cantidad y atajos */}
                    <div className="w-1/3 flex items-center justify-end gap-1.5">
                      {/* Atajos rápidos +6 y +12 */}
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(cantStr, 10) || 0;
                          handleCantidadChange(v.id, String(current + 6));
                        }}
                        className="hidden sm:inline-flex text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        title="Sumar 6 prendas"
                      >
                        +6
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(cantStr, 10) || 0;
                          handleCantidadChange(v.id, String(current + 12));
                        }}
                        className="hidden sm:inline-flex text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        title="Sumar 12 prendas"
                      >
                        +12
                      </button>

                      <Input
                        type="number"
                        min="0"
                        placeholder={yaEstaEnConteo ? "+ sumar" : "0"}
                        value={cantStr}
                        onChange={(e) => handleCantidadChange(v.id, e.target.value)}
                        className={`w-20 h-8 text-xs text-center font-bold bg-background ${
                          isSelected ? "border-primary ring-1 ring-primary/40" : ""
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sección desplegable: Crear nueva variante */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-muted/20">
            <button
              type="button"
              onClick={() => setIsCreatingNew((prev) => !prev)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-foreground hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-primary">
                <Plus className="w-3.5 h-3.5" />
                ¿No encuentras el color o talla? Crear nueva variante en catálogo
              </span>
              {isCreatingNew ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {isCreatingNew && (
              <div className="p-3.5 pt-1 border-t border-border bg-background space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Color *
                    </label>
                    <Input
                      placeholder="Ej. Amarillo, Verde Militar..."
                      value={nuevoColor}
                      onChange={(e) => setNuevoColor(e.target.value)}
                      disabled={isPending}
                      className="h-8 text-xs"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Talla (Opcional)
                    </label>
                    <Input
                      placeholder="Ej. M, XL, 3XL..."
                      value={nuevaTalla}
                      onChange={(e) => setNuevaTalla(e.target.value)}
                      disabled={isPending}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Cantidad Inicial
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={nuevaCantidad}
                      onChange={(e) => setNuevaCantidad(e.target.value)}
                      disabled={isPending}
                      className="h-8 text-xs text-center font-bold"
                    />
                  </div>
                </div>

                {previewSkuNueva && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/50">
                    <span className="font-semibold text-foreground">SKU generado:</span>
                    <span className="font-mono font-bold text-primary">{previewSkuNueva}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setNuevoColor("");
                      setNuevaTalla("");
                    }}
                    disabled={isPending}
                    className="h-7 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCrearNuevaVariante}
                    disabled={isPending || !nuevoColor.trim()}
                    className="h-7 text-xs gap-1 font-semibold bg-primary text-primary-foreground"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Guardar y agregar al conteo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer con resumen y acción final */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {resumenSeleccion.numVariantes > 0 ? (
              <span className="font-medium text-foreground">
                <strong className="text-primary font-bold">{resumenSeleccion.numVariantes}</strong>{" "}
                {resumenSeleccion.numVariantes === 1 ? "variante lista" : "variantes listas"} ·{" "}
                <strong className="text-primary font-mono font-bold">
                  {resumenSeleccion.totalPrendas}
                </strong>{" "}
                prendas a ingresar
              </span>
            ) : (
              <span>Escribe la cantidad en las variantes para seleccionarlas.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isPending}
              className="h-8 text-xs"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarAgregar}
              disabled={isPending || resumenSeleccion.numVariantes === 0}
              className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              Agregar al Conteo ({resumenSeleccion.totalPrendas} uds)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
