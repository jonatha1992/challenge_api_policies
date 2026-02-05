import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extender la interfaz Request de Express para incluir correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Middleware que gestiona el correlation_id para trazabilidad de peticiones.
 *
 * Este middleware es crucial para el seguimiento de logs y operaciones a través
 * de todo el sistema. Permite correlacionar logs de diferentes componentes
 * que procesan la misma petición.
 *
 * Funcionamiento:
 * - Si la petición incluye el header 'x-correlation-id', utiliza ese valor
 * - Si no incluye el header, genera un nuevo UUID único
 * - Agrega el correlation_id al objeto request para uso interno en controladores
 * - Incluye el correlation_id en el header de respuesta para que el cliente pueda rastrear
 *
 * @param req - Objeto Request de Express
 * @param res - Objeto Response de Express
 * @param next - Función para continuar con el siguiente middleware/controlador
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Intentar obtener correlation_id del header, o generar uno nuevo si no existe
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

  // Agregar el correlation_id al request para uso en controladores y servicios
  req.correlationId = correlationId;

  // Incluir el correlation_id en la respuesta para trazabilidad del cliente
  res.setHeader('x-correlation-id', correlationId);

  // Continuar con el siguiente middleware o controlador
  next();
};

