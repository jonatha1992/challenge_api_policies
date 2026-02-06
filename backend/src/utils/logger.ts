
// Importamos la librería winston para manejo de logs estructurados y colorizados en consola.
import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Interfaz que define el contexto adicional que puede acompañar cada log.
 * Permite agregar información útil para trazabilidad y debugging.
 */
interface LogContext {
  correlation_id?: string; // ID de correlación para rastrear la petición
  operation_id?: string;   // ID de la operación en base de datos
  endpoint?: string;       // Endpoint HTTP relacionado
  duration_ms?: number;    // Duración de la operación en milisegundos
  inserted?: number;       // Cantidad de registros insertados
  rejected?: number;       // Cantidad de registros rechazados
  [key: string]: unknown;  // Permite agregar cualquier otro dato relevante
}

/**
 * Determina el directorio de logs según el entorno.
 * - Desarrollo: ./logs (dentro del proyecto)
 * - Producción: Variable LOG_DIR o /var/log/challenge-tekne
 */
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const LOG_DIR = isDev
  ? path.join(__dirname, '../../logs')                    // Desarrollo
  : process.env.LOG_DIR || '/var/log/challenge-tekne';   // Producción

// Crear directorio de logs si no existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  console.log(`📁 Log directory created: ${LOG_DIR}`);
}

/**
 * Instancia principal del logger.
 * Configura el nivel, formato y salida de los logs.
 * - Los logs incluyen timestamp, nivel y mensaje.
 * - Los metadatos se muestran como JSON si existen.
 * - Se guardan en archivos rotativos (10MB máximo por archivo).
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Nivel de log (info, warn, error, debug)
  format: winston.format.combine(
    winston.format.timestamp(),            // Agrega timestamp a cada log
    winston.format.errors({ stack: true }), // Incluye stack traces en errores
    winston.format.json()                  // Formato JSON para facilitar parsing
  ),
  defaultMeta: { service: 'challenge-tekne-api' }, // Meta por defecto para identificar el servicio
  transports: [
    // Transporte 1: Consola (para desarrollo y debugging en tiempo real)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),         // Colorea el nivel del log en consola
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          // Si hay metadatos, los mostramos como JSON
          const metaStr = Object.keys(meta).length > 1 ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      )
    }),

    // Transporte 2: Archivo para TODOS los logs (rotativo)
    ...(process.env.NODE_ENV !== 'test' ? [
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'combined.log'),
        maxsize: 10485760,  // 10MB
        maxFiles: 5,        // Mantener últimos 5 archivos
        format: winston.format.json()
      }),

      // Transporte 3: Archivo solo para ERRORES (rotativo)
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'error.log'),
        level: 'error',
        maxsize: 10485760,  // 10MB
        maxFiles: 5,
        format: winston.format.json()
      })
    ] : [])
  ]
});


/**
 * Crea un logger contextualizado para una operación específica.
 * Permite agregar automáticamente el contexto a cada log generado.
 * Ejemplo de uso:
 *   const log = createContextLogger({ correlation_id: 'abc123' });
 *   log.info('Operación iniciada');
 */
export const createContextLogger = (context: LogContext) => {
  return {
    /**
     * Log de información general.
     * @param message Mensaje principal
     * @param extra   Metadatos adicionales
     */
    info: function logInfo(message: string, extra?: object) {
      logger.info(message, { ...context, ...extra });
    },
    /**
     * Log de error.
     * @param message Mensaje principal
     * @param extra   Metadatos adicionales
     */
    error: function logError(message: string, extra?: object) {
      logger.error(message, { ...context, ...extra });
    },
    /**
     * Log de advertencia.
     * @param message Mensaje principal
     * @param extra   Metadatos adicionales
     */
    warn: function logWarn(message: string, extra?: object) {
      logger.warn(message, { ...context, ...extra });
    },
    /**
     * Log de depuración.
     * @param message Mensaje principal
     * @param extra   Metadatos adicionales
     */
    debug: function logDebug(message: string, extra?: object) {
      logger.debug(message, { ...context, ...extra });
    }
  };
};


// Exportamos la instancia principal del logger para uso global.
export default logger;

