// Servicio de API para comunicación con el backend
// Centraliza todas las llamadas HTTP y definiciones de tipos

import axios from 'axios';

// URL base de la API, configurable via variable de entorno
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Instancia configurada de Axios para todas las llamadas a la API
export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ==========================================
// DEFINICIONES DE TIPOS
// ==========================================

/**
 * Representa una póliza de seguros en el frontend
 * Similar al tipo del backend pero adaptado para el consumo del cliente
 */
export interface Policy {
  id: number;                    // ID único de la póliza
  policy_number: string;         // Número único de la póliza
  customer: string;              // Nombre del cliente asegurado
  policy_type: string;           // Tipo de póliza (Property, Auto, Life, Health)
  start_date: string;            // Fecha de inicio (formato ISO string)
  end_date: string;              // Fecha de fin (formato ISO string)
  premium_usd: number;           // Prima mensual en dólares
  status: string;                // Estado actual (active, expired, cancelled)
  insured_value_usd: number;     // Valor total asegurado en dólares
  created_at: string;            // Fecha de creación (formato ISO string)
}

/**
 * Representa un error de validación encontrado durante el procesamiento
 */
export interface ValidationError {
  row_number: number;  // Número de fila en el CSV donde ocurrió el error
  field: string;       // Campo específico que falló la validación
  code: string;        // Código único del tipo de error
  message?: string;    // Mensaje descriptivo del error (opcional)
}

/**
 * Resultado de una operación de carga masiva de pólizas
 */
export interface UploadResult {
  operation_id: string;     // ID único de la operación de carga
  correlation_id: string;   // ID de correlación para trazabilidad
  inserted_count: number;   // Número de pólizas insertadas exitosamente
  updated_count: number;    // Número de pólizas actualizadas (duplicados)
  rejected_count: number;   // Número de pólizas rechazadas por errores
  errors: ValidationError[]; // Lista detallada de todos los errores encontrados
  updated_policies: string[]; // Policy numbers que fueron actualizados
  http_status?: number;     // Código HTTP de la respuesta (200, 207, 422)
}

/**
 * Respuesta genérica paginada para listas de elementos
 */
export interface PaginatedResponse {
  items: Policy[];              // Array de pólizas de la página actual
  pagination: {
    limit: number;         // Número máximo de elementos por página
    offset: number;        // Desplazamiento desde el inicio
    total: number;         // Total de elementos disponibles
  };
}

/**
 * Resumen estadístico del portfolio completo de pólizas
 */
export interface PolicySummary {
  total_policies: number;              // Total de pólizas en el sistema
  total_premium_usd: number;           // Suma total de primas en dólares
  count_by_status: Record<string, number>; // Conteo de pólizas por estado
  premium_by_type: Record<string, number>; // Suma de primas por tipo de póliza
}

/**
 * Respuesta de la API de insights con IA
 */
export interface InsightsResponse {
  insights: string[];           // Lista de insights generados por IA
  highlights: {
    total_policies: number;      // Total de pólizas analizadas
    risk_flags: number;          // Número de banderas de riesgo identificadas
    recommendations_count: number; // Número de recomendaciones generadas
  };
}

/**
 * Respuesta del endpoint de health check
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'connected' | 'disconnected';
  version?: string;
  error?: string;
}

/**
 * Filtros opcionales para consultas de pólizas
 */
export interface PolicyFilters {
  limit?: number;     // Límite de resultados por página
  offset?: number;    // Desplazamiento para paginación
  status?: string;    // Filtrar por estado específico
  policy_type?: string; // Filtrar por tipo de póliza
  q?: string;         // Búsqueda por texto (número de póliza o cliente)
}

// ==========================================
// FUNCIONES DE LA API
// ==========================================

/**
 * Sube un archivo CSV al servidor para procesamiento masivo de pólizas
 * @param file Archivo CSV a procesar
 * @returns Resultado del procesamiento con estadísticas y errores
 */
export const uploadCSV = async (file: File): Promise<UploadResult> => {
  // Crear FormData para enviar el archivo
  const formData = new FormData();
  formData.append('file', file);

  // Realizar petición POST con el archivo
  // validateStatus acepta 200, 207 y 422 como respuestas válidas del negocio
  const response = await api.post<UploadResult>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    validateStatus: (status) => {
      // Aceptar 200 OK, 207 Multi-Status, y 422 Unprocessable Entity
      return status === 200 || status === 207 || status === 422;
    }
  });

  // Incluir el código HTTP en la respuesta para que el componente pueda mostrarlo
  return {
    ...response.data,
    http_status: response.status
  };
};

/**
 * Obtiene una lista paginada de pólizas con filtros opcionales
 * @param params Filtros y opciones de paginación
 * @returns Lista paginada de pólizas
 */
export const getPolicies = async (params: PolicyFilters): Promise<PaginatedResponse> => {
  // Realizar petición GET con parámetros de consulta
  const response = await api.get<PaginatedResponse>('/policies', { params });
  return response.data;
};

/**
 * Obtiene el resumen estadístico del portfolio completo
 * @returns Estadísticas agregadas de todas las pólizas
 */
export const getSummary = async (): Promise<PolicySummary> => {
  // Realizar petición GET al endpoint de resumen
  const response = await api.get<PolicySummary>('/policies/summary');
  return response.data;
};

/**
 * Genera insights avanzados sobre el portfolio usando IA
 * @param filters Filtros para limitar el análisis
 * @returns Insights generados por IA con métricas destacadas
 */
export const getInsights = async (filters: PolicyFilters): Promise<InsightsResponse> => {
  // Realizar petición POST con filtros para el análisis
  const response = await api.post<InsightsResponse>('/ai/insights', { filters });
  return response.data;
};

/**
 * Verifica la disponibilidad del backend y su conexión a la base de datos
 * @returns Estado del servidor y sus componentes
 */
export const checkHealth = async (): Promise<HealthCheckResponse> => {
  // Realizar petición GET al endpoint de health check
  const response = await api.get<HealthCheckResponse>('/health');
  return response.data;
};
