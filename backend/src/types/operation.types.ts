// Tipos y interfaces para el sistema de trazabilidad de operaciones de carga

// Estados posibles de una operación de carga en el sistema
export type OperationStatus = 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Representa una operación de carga de datos en el sistema.
 * Registra el procesamiento de archivos CSV y mantiene trazabilidad completa.
 */
export interface Operation {
  id: string;                    // ID único de la operación (UUID)
  created_at: Date;              // Fecha y hora cuando se inició la operación
  endpoint: string;              // Endpoint de la API que procesó la operación
  status: OperationStatus;       // Estado actual del procesamiento
  correlation_id: string;        // ID de correlación para agrupar logs relacionados
  rows_inserted: number;         // Número de filas insertadas exitosamente en la base de datos
  rows_rejected: number;         // Número de filas rechazadas por validaciones
  duration_ms?: number;          // Duración total del procesamiento en milisegundos (opcional)
  error_summary?: string | null; // Resumen de errores si la operación falló (opcional)
}
