// Archivo principal de configuración de rutas de la API
// Define todos los endpoints disponibles en el sistema de pólizas

import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/UploadController';
import { PolicyController } from '../controllers/PolicyController';
import { AIController } from '../controllers/AIController';
import { DiagnosticController } from '../controllers/DiagnosticController';

// Crear instancia del router de Express
const router = Router();

// Configurar multer para manejar la carga de archivos CSV
// Se usa almacenamiento en memoria para procesar archivos temporales
const upload = multer({
  storage: multer.memoryStorage(),  // Almacenar archivo en memoria RAM
  limits: {
    fileSize: 10 * 1024 * 1024      // Limitar tamaño máximo a 10MB
  },
  // Validar que solo se acepten archivos CSV
  fileFilter: (req, file, cb) => {
    // Verificar tipo MIME o extensión del archivo
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);  // Aceptar el archivo
    } else {
      cb(new Error('Only CSV files are allowed'));  // Rechazar con error
    }
  }
});

// Instanciar los controladores que manejarán las rutas
const uploadController = new UploadController();  // Controlador para carga de archivos
const policyController = new PolicyController();  // Controlador para consultas de pólizas
const aiController = new AIController();          // Controlador para insights con IA
const diagnosticController = new DiagnosticController(); // Controlador para diagnóstico del sistema

// ==========================================
// RUTAS DE CARGA DE DATOS
// ==========================================

// Endpoint para cargar archivos CSV con pólizas
// POST /upload
// Body: multipart/form-data con campo 'file' conteniendo el CSV
router.post('/upload', upload.single('file'), (req, res) => uploadController.upload(req, res));

// ==========================================
// RUTAS DE CONSULTA DE PÓLIZAS
// ==========================================

// Endpoint para listar pólizas con filtros opcionales
// GET /policies?status=active&type=Property&q=search&limit=10&offset=0
router.get('/policies', (req, res) => policyController.list(req, res));

// Endpoint para obtener resumen estadístico del portfolio
// GET /policies/summary
router.get('/policies/summary', (req, res) => policyController.summary(req, res));

// ==========================================
// RUTAS DE INTELIGENCIA ARTIFICIAL
// ==========================================

// Endpoint para generar insights avanzados sobre el portfolio
// POST /ai/insights
// Body: { "use_ai": true/false } - opcional, por defecto usa IA si está disponible
router.post('/ai/insights', (req, res) => aiController.generateInsights(req, res));

// ==========================================
// RUTAS DE DIAGNÓSTICO
// ==========================================

// Endpoint para diagnóstico completo del sistema
// GET /config/validate
// Verifica variables de entorno, conexión a BD, runtime y servicios
router.get('/config/validate', (req, res) => diagnosticController.validate(req, res));

// Exportar el router configurado para ser usado en la aplicación principal
export default router;
