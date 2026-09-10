-- JIMMO V4.1 - pruebas E2E / integración
-- Requiere una instancia PostgreSQL/Supabase de PRUEBA con los catálogos
-- y perfiles/vendedores necesarios. No ejecutar en producción.
-- Las pruebas deben ejecutarse dentro de una transacción cuando sea posible.
-- La autenticación/RLS debe probarse con usuarios reales de la instancia de test.

-- ============================================================
-- CASOS OBLIGATORIOS
-- ============================================================
-- 1. Crear BORRADOR con 1+ variantes.
--    Esperado: pedido BORRADOR, detalles activos, stock intacto.
--
-- 2. Completar BORRADOR.
--    Esperado: reserva FIFO creada, consumo de lotes, SALIDA_VENTA,
--    pedido COMPLETADO, reserva inactiva, invariantes intactas.
--
-- 3. Crear RESERVADO.
--    Esperado: stock_reservado aumenta y disponibilidad por lote disminuye.
--
-- 4. Cancelar RESERVADO.
--    Esperado: cantidad vuelve a disponible, reservado vuelve a cero,
--    asignaciones activas pasan a activa=FALSE, historial permanece.
--
-- 5. Editar BORRADOR.
--    Esperado: detalles anteriores activo=FALSE y nuevos detalles activos.
--
-- 6. Editar RESERVADO.
--    Esperado: FIFO anterior se libera, asignaciones antiguas quedan
--    inactivas, nuevo FIFO se asigna, invariantes intactas.
--
-- 7. Editar COMPLETADO/CANCELADO.
--    Esperado: error; no debe cambiar ningún dato.
--
-- 8. FIFO con dos o más lotes.
--    Esperado: se consume primero el lote más antiguo según
--    fecha_recepcion/fecha_compra, luego numero_lote e id.
--
-- 9. FIFO con costos adicionales.
--    Esperado: costo unitario = base + otros_costos prorrateados +
--    costos_lote prorrateados; la asignación conserva el costo histórico.
--
-- 10. Stock insuficiente.
--     Esperado: error y rollback completo; no quedan reservas parciales.
--
-- 11. Pago concurrente.
--     Ejecutar dos sesiones intentando pagar el mismo saldo.
--     Esperado: el bloqueo FOR UPDATE impide que ambas operaciones
--     acepten un monto superior al saldo real.
--
-- 12. Autorización.
--     Vendedor A intentando completar/cancelar/editar/registrar_pago
--     de vendedor B.
--     Esperado: error de autorización.
--
-- 13. Admin.
--     Admin puede operar pedidos de cualquier vendedor y recibir lotes.
--
-- 14. Invariantes.
--     Después de cada operación de stock verificar:
--       stock_reservado <= stock_actual
--       stock_actual = SUM(disponible + reservado) de lotes recibidos/cerrados
--       stock_reservado = SUM(reservado) de lotes recibidos/cerrados
--
-- ============================================================
-- CONSULTA DE AUDITORÍA RÁPIDA
-- ============================================================
SELECT
  v.id AS variante_id,
  v.stock_actual,
  v.stock_reservado,
  COALESCE(SUM(dl.cantidad_disponible + dl.cantidad_reservada)
           FILTER (WHERE l.estado IN ('RECIBIDO','CERRADO')),0) AS stock_por_lotes,
  COALESCE(SUM(dl.cantidad_reservada)
           FILTER (WHERE l.estado IN ('RECIBIDO','CERRADO')),0) AS reservado_por_lotes
FROM variantes_producto v
LEFT JOIN detalle_lote dl ON dl.variante_id=v.id
LEFT JOIN lotes l ON l.id=dl.lote_id
GROUP BY v.id, v.stock_actual, v.stock_reservado
HAVING v.stock_actual <> COALESCE(SUM(dl.cantidad_disponible + dl.cantidad_reservada)
           FILTER (WHERE l.estado IN ('RECIBIDO','CERRADO')),0)
    OR v.stock_reservado <> COALESCE(SUM(dl.cantidad_reservada)
           FILTER (WHERE l.estado IN ('RECIBIDO','CERRADO')),0)
    OR v.stock_reservado > v.stock_actual;
-- Debe devolver 0 filas.

-- Auditoría de detalles históricos de pedidos editados/cancelados.
SELECT dp.pedido_id,
       COUNT(*) FILTER (WHERE dp.activo) AS detalles_activos,
       COUNT(*) FILTER (WHERE NOT dp.activo) AS detalles_historicos
FROM detalle_pedido dp
GROUP BY dp.pedido_id
ORDER BY dp.pedido_id;
