import { describe, it, expect } from "vitest";
import { z } from "zod";

// Zod Schema definitions matching Server Actions
const categoriaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  descripcion: z.string().optional().nullable(),
});

const pagoSchema = z.object({
  pedido_id: z.string().uuid(),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  metodo_pago: z.enum(["EFECTIVO", "TRANSFERENCIA", "QR", "TARJETA", "DEPOSITO", "OTRO"]),
  referencia: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

const recibiLoteSchema = z.object({
  lote_id: z.string().uuid("Lote inválido"),
});

describe("Zod Validation Schemas", () => {
  describe("Categoria Schema", () => {
    it("validates valid input", () => {
      const res = categoriaSchema.safeParse({ nombre: "Ropa", descripcion: "Prendas de vestir" });
      expect(res.success).toBe(true);
    });

    it("rejects empty category name", () => {
      const res = categoriaSchema.safeParse({ nombre: "" });
      expect(res.success).toBe(false);
    });
  });

  describe("Pago Schema", () => {
    it("validates valid payment request", () => {
      const res = pagoSchema.safeParse({
        pedido_id: "123e4567-e89b-12d3-a456-426614174000",
        monto: 150.5,
        metodo_pago: "QR",
        referencia: "QR-992381",
      });
      expect(res.success).toBe(true);
    });

    it("rejects non-positive payment amount", () => {
      const res = pagoSchema.safeParse({
        pedido_id: "123e4567-e89b-12d3-a456-426614174000",
        monto: -50,
        metodo_pago: "EFECTIVO",
      });
      expect(res.success).toBe(false);
    });

    it("rejects invalid UUID for pedido_id", () => {
      const res = pagoSchema.safeParse({
        pedido_id: "invalid-uuid",
        monto: 100,
        metodo_pago: "EFECTIVO",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("Recibir Lote Schema", () => {
    it("validates valid lote UUID", () => {
      const res = recibiLoteSchema.safeParse({
        lote_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid lote ID", () => {
      const res = recibiLoteSchema.safeParse({
        lote_id: "12345",
      });
      expect(res.success).toBe(false);
    });
  });
});
