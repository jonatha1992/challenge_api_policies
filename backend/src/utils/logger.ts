
// Importamos la librería winston para manejo de logs estructurados y colorizados en consola.
import winston from 'winston';


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
 * Instancia principal del logger.
 * Configura el nivel, formato y salida de los logs.
 * - Los logs incluyen timestamp, nivel y mensaje.
 * - Los metadatos se muestran como JSON si existen.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Nivel de log (info, warn, error, debug)
  format: winston.format.combine(
    winston.format.timestamp(),            // Agrega timestamp a cada log
    winston.format.json()                  // Formato JSON para facilitar parsing
  ),
  defaultMeta: { service: 'challenge-teknet-api' }, // Meta por defecto para identificar el servicio
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),         // Colorea el nivel del log en consola
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          // Si hay metadatos, los mostramos como JSON
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      )
    })
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
