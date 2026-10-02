-- Seed inicial para tipos_entrega
INSERT INTO tipos_entrega (nombre, descripcion, activo)
VALUES
    ('Retiro en Tienda', 'El cliente recoge el producto en tienda física', TRUE),
    ('Punto de Recojo', 'Entrega coordinada en un punto de encuentro', TRUE),
    ('Envío por Agencia', 'Envío a través de terminal o empresa de transporte', TRUE)
ON CONFLICT (nombre) DO NOTHING;
