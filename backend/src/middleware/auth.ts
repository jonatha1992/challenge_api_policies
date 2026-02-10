import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware para validar el header x-api-key.
 * Compara el key enviado por el cliente con el configurado en el servidor (API_KEY).
 */
export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Eximir endpoints públicos (salud y documentación)
    const publicPaths = ['/health', '/api-docs'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    const apiKey = req.headers['x-api-key'];
    const configuredApiKey = process.env.API_KEY;

    // Si no hay key configurado en el servidor, permitir pasar (para evitar bloqueo accidental)
    if (!configuredApiKey) {
        return next();
    }

    // Validar que el cliente envió el key y que coincide
    if (!apiKey || apiKey !== configuredApiKey) {
        logger.warn('Unauthorized API access attempt', {
            path: req.path,
            method: req.method,
            correlation_id: req.correlationId,
            has_key: !!apiKey
        });

        return res.status(401).json({
            error: 'Unauthorized access. Valid API key required in x-api-key header.',
            correlation_id: req.correlationId
        });
    }

    // Si coincide, continuar
    next();
};
