-- Migración 002: Agregar columna rows_updated a la tabla operations
-- Esta columna permite rastrear cuántas pólizas fueron actualizadas (en lugar de insertadas)
-- durante una operación de upload.

-- Agregar columna rows_updated a la tabla operations
ALTER TABLE operations
ADD COLUMN IF NOT EXISTS rows_updated INTEGER DEFAULT 0;

-- Agregar comentario descriptivo a la columna
COMMENT ON COLUMN operations.rows_updated IS 'Number of policies updated (not inserted) during the operation';
