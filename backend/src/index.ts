// Archivo principal de la aplicación backend
// Configura y inicia el servidor Express con todos los middlewares y rutas

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { correlationIdMiddleware } from './middleware/correlationId';
import routes from './routes';
import { initializeDatabase } from './config/database';
import { setupSwagger } from './config/swagger';
import logger from './utils/logger';
import { validateEnvOrExit } from './config/validateEnv';

// Cargar variables de entorno desde archivo .env
dotenv.config();

// Validar variables de entorno antes de continuar
validateEnvOrExit();

// Crear instancia principal de la aplicación Express
const app = express();

// Puerto del servidor, configurable via variable de entorno
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURACIÓN DE MIDDLEWARES GLOBALES
// ==========================================

// Middleware CORS para permitir requests desde el frontend
app.use(cors());

// Middleware para parsear JSON en el body de las requests
app.use(express.json());

// Middleware personalizado para asignar ID de correlación a cada request
// Esto permite rastrear requests a través de logs y operaciones
app.use(correlationIdMiddleware);

// ==========================================
// MIDDLEWARE DE LOGGING DE REQUESTS
// ==========================================

// Middleware que registra todas las requests HTTP con métricas de performance
app.use((req, res, next) => {
  // Registrar timestamp de inicio de la request
  const start = Date.now();

  // Escuchar el evento 'finish' de la response para calcular duración
  res.on('finish', () => {
    // Calcular duración total en milisegundos
    const duration = Date.now() - start;

    // Registrar información de la request en los logs
    logger.info(`${req.method} ${req.path}`, {
      correlation_id: req.correlationId,  // ID para rastrear la request
      status: res.statusCode,             // Código de estado HTTP
      duration_ms: duration               // Tiempo de procesamiento
    });
  });

  // Continuar con el siguiente middleware
  next();
});

// ==========================================
// CONFIGURACIÓN DE SWAGGER/OPENAPI
// ==========================================

// Configurar documentación interactiva de la API
setupSwagger(app);

// ==========================================
// CONFIGURACIÓN DE RUTAS
// ==========================================

// Montar todas las rutas de la API en la aplicación
app.use(routes);

// ==========================================
// ENDPOINTS DE UTILIDAD
// ==========================================

// Endpoint de health check para monitoreo y load balancers
app.get('/health', async (req, res) => {
  try {
    // Verificar conexión a base de datos
    const { checkConnection } = await import('./config/database');
    const dbStatus = await checkConnection();

    if (!dbStatus.connected) {
      throw new Error(dbStatus.error || 'Database disconnected');
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0',
      db_version: dbStatus.version
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================
// MANEJO GLOBAL DE ERRORES
// ==========================================

// Middleware de catch-all para errores no manejados
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Registrar el error en los logs con contexto completo
  logger.error('Unhandled error', {
    error: err.message,           // Mensaje del error
    stack: err.stack,             // Stack trace completo
    correlation_id: req.correlationId  // ID para rastrear el error
  });

  // Responder con error 500 genérico (no exponer detalles internos)
  res.status(500).json({
    error: 'Internal server error',
    correlation_id: req.correlationId  // Incluir ID de correlación en la respuesta
  });
});

// ==========================================
// INICIALIZACIÓN DEL SERVIDOR
// ==========================================

/**
 * Función asíncrona que inicializa y arranca el servidor.
 * Realiza la conexión a la base de datos antes de iniciar el servidor HTTP.
 */
const startServer = async () => {
  try {
    // Inicializar conexión a la base de datos
    await initializeDatabase();

    // Iniciar servidor HTTP y escuchar en el puerto configurado
    app.listen(PORT, () => {
      // Registrar inicio exitoso del servidor
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    // Si falla la inicialización, registrar error y terminar proceso
    logger.error('Failed to start server', { error });
    process.exit(1);  // Código de salida 1 indica error
  }
};

// Ejecutar la función de inicialización del servidor
startServer();

