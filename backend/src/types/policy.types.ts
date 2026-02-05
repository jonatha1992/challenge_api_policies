// Tipos y interfaces principales para el dominio de pólizas de seguros

// Tipos enumerados para clasificar pólizas
export type PolicyType = 'Property' | 'Auto' | 'Life' | 'Health';  // Tipos de póliza disponibles
export type PolicyStatus = 'active' | 'expired' | 'cancelled';    // Estados posibles de una póliza

/**
 * Representa una póliza de seguros en el sistema.
 * Contiene toda la información necesaria para gestionar una póliza.
 */
export interface Policy {
  id?: number;              // ID único en base de datos (opcional para nuevas pólizas)
  policy_number: string;    // Número único de la póliza
  customer: string;         // Nombre del cliente asegurado
  policy_type: PolicyType;  // Tipo de póliza (Property, Auto, Life, Health)
  start_date: Date;         // Fecha de inicio de cobertura
  end_date: Date;           // Fecha de fin de cobertura
  premium_usd: number;      // Prima mensual en dólares
  status: PolicyStatus;     // Estado actual de la póliza
  insured_value_usd: number; // Valor total asegurado en dólares
  created_at?: Date;        // Fecha de creación en el sistema (opcional)
}

/**
 * Datos de entrada crudos para crear una póliza.
 * Viene directamente del CSV, con tipos string que necesitan conversión.
 */
export interface PolicyInput {
  policy_number: string;        // Número de póliza como string
  customer: string;             // Nombre del cliente
  policy_type: string;          // Tipo de póliza como string (se valida después)
  start_date: string;           // Fecha de inicio como string (formato YYYY-MM-DD)
  end_date: string;             // Fecha de fin como string (formato YYYY-MM-DD)
  premium_usd: string | number; // Prima como string o número
  status: string;               // Estado como string (se valida después)
  insured_value_usd: string | number; // Valor asegurado como string o número
}

/**
 * Representa un error de validación encontrado durante el procesamiento.
 * Se usa tanto para validaciones técnicas como de negocio.
 */
export interface ValidationError {
  row_number: number;  // Número de fila en el CSV donde ocurrió el error
  field: string;       // Campo específico que falló la validación
  code: string;        // Código único del tipo de error
  message?: string;    // Mensaje descriptivo del error (opcional)
}

/**
 * Resultado de una operación de carga masiva de pólizas.
 * Incluye métricas de éxito y errores encontrados.
 */
export interface UploadResult {
  operation_id: string;     // ID único de la operación de carga
  correlation_id: string;   // ID de correlación para trazabilidad
  inserted_count: number;   // Número de pólizas insertadas exitosamente
  updated_count: number;    // Número de pólizas actualizadas (duplicados)
  rejected_count: number;   // Número de pólizas rechazadas por errores
  errors: ValidationError[]; // Lista detallada de todos los errores encontrados
  updated_policies: string[]; // Policy numbers que fueron actualizados
}

/**
 * Respuesta genérica paginada para listas de elementos.
 * Se usa para devolver resultados de consultas con paginación.
 */
export interface PaginatedResponse<T> {
  items: T[];              // Array de elementos de la página actual
  pagination: {
    limit: number;         // Número máximo de elementos por página
    offset: number;        // Desplazamiento desde el inicio
    total: number;         // Total de elementos disponibles
  };
}

/**
 * Resumen estadístico del portfolio completo de pólizas.
 * Proporciona métricas agregadas para análisis y reporting.
 */
export interface PolicySummary {
  total_policies: number;              // Total de pólizas en el sistema
  total_premium_usd: number;           // Suma total de primas en dólares
  count_by_status: Record<string, number>; // Conteo de pólizas por estado
  premium_by_type: Record<string, number>; // Suma de primas por tipo de póliza
}

/**
 * Filtros opcionales para consultas de pólizas.
 * Permite refinar búsquedas por diferentes criterios.
 */
export interface PolicyFilters {
  status?: PolicyStatus;     // Filtrar por estado específico
  policy_type?: PolicyType;  // Filtrar por tipo de póliza
  q?: string;                // Búsqueda por texto (número de póliza o cliente)
  limit?: number;            // Límite de resultados por página
  offset?: number;           // Desplazamiento para paginación
}
