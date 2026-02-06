# Sistema de Logging

Documentación completa del sistema de logging implementado en el backend.

## Resumen

El sistema utiliza **Winston** para logging estructurado con:
- ✅ Logs en consola (desarrollo)
- ✅ Logs en archivos rotativos (producción)
- ✅ Separación de logs por nivel (error vs combined)
- ✅ Formato JSON para parsing automático
- ✅ Contexto y trazabilidad con correlation IDs

---

## Arquitectura

```
Logger (Winston)
    ├─ Console Transport (desarrollo)
    │   └─ Coloreado y formato legible
    ├─ File Transport: combined.log
    │   ├─ Todos los logs (info, warn, error)
    │   ├─ Rotación: 10MB x 5 archivos
    │   └─ Formato: JSON
    └─ File Transport: error.log
        ├─ Solo errores
        ├─ Rotación: 10MB x 5 archivos
        └─ Formato: JSON
```

---

## Configuración

### Variables de Entorno

```env
# Nivel de logging (debug, info, warn, error)
LOG_LEVEL=info

# Directorio de logs (producción)
LOG_DIR=/var/log/challenge-tekne

# Entorno
NODE_ENV=development
```

### Ubicación de Logs

#### Desarrollo
```
backend/
└── logs/
    ├── combined.log    ← Todos los logs
    ├── error.log       ← Solo errores
    └── README.md
```

#### Producción
```
/var/log/challenge-tekne/    (Linux/Unix)
C:\Logs\challenge-tekne\     (Windows)
```

---

## Uso Básico

### Importar el Logger

```typescript
import logger from './utils/logger';
```

### Niveles de Log

```typescript
// 1. DEBUG - Información de debugging
logger.debug('User query parameters', { userId: 123, filters: {...} });

// 2. INFO - Información general
logger.info('Server started on port 3000');

// 3. WARN - Advertencias que no son errores críticos
logger.warn('API rate limit approaching', { remaining: 10 });

// 4. ERROR - Errores que requieren atención
logger.error('Database connection failed', { error: err.message });
```

### Con Contexto Adicional

```typescript
logger.info('Policy created', {
  correlation_id: req.correlationId,
  policy_number: 'POL-123',
  customer: 'John Doe',
  duration_ms: 45
});
```

---

## Logger Contextualizado

Para operaciones con contexto compartido:

```typescript
import { createContextLogger } from './utils/logger';

// En un controlador o servicio
const log = createContextLogger({
  correlation_id: req.correlationId,
  operation_id: operationId,
  endpoint: req.path
});

// Todos los logs heredan el contexto
log.info('Starting upload');
log.warn('Large file detected', { size_mb: 15 });
log.error('Upload failed', { error: err.message });
```

**Ventajas:**
- ✅ No repetir correlation_id en cada log
- ✅ Facilita el rastreo de operaciones
- ✅ Contexto consistente en toda la operación

---

## Formato de Logs

### Consola (Desarrollo)

```
2026-02-05T10:30:45.123Z [info]: Server started on port 3000
2026-02-05T10:31:12.456Z [error]: Database error {"correlation_id":"abc123","error":"Connection timeout"}
```

### Archivo JSON (Producción)

```json
{
  "level": "info",
  "message": "Server started on port 3000",
  "service": "challenge-tekne-api",
  "timestamp": "2026-02-05T10:30:45.123Z"
}

{
  "level": "error",
  "message": "Database error",
  "service": "challenge-tekne-api",
  "correlation_id": "abc123",
  "error": "Connection timeout",
  "timestamp": "2026-02-05T10:31:12.456Z",
  "stack": "Error: Connection timeout\n    at Connection.connect (/app/database.ts:45:10)"
}
```

---

## Rotación de Archivos

### Configuración Actual

- **Tamaño máximo por archivo:** 10MB
- **Archivos mantenidos:** 5
- **Total espacio máximo:** 50MB por tipo

### Ejemplo de Rotación

```
logs/
├── combined.log         ← Archivo actual
├── combined.log.1       ← Rotación 1 (más reciente)
├── combined.log.2
├── combined.log.3
├── combined.log.4
├── combined.log.5       ← Rotación 5 (más antigua, se elimina al rotar)
├── error.log
└── error.log.1
```

**Comportamiento:**
1. `combined.log` alcanza 10MB
2. Se renombra a `combined.log.1`
3. Se crea nuevo `combined.log`
4. Archivos antiguos se mueven (.2 → .3, etc.)
5. El archivo `.5` se elimina

---

## Mejores Prácticas

### ✅ HACER

```typescript
// 1. Usar niveles apropiados
logger.info('User logged in', { userId: 123 });
logger.error('Payment failed', { orderId: 456, error: err.message });

// 2. Incluir contexto relevante
logger.warn('Slow query detected', {
  query: 'SELECT * FROM policies',
  duration_ms: 3500,
  threshold_ms: 1000
});

// 3. Usar correlation IDs
logger.info('Request completed', {
  correlation_id: req.correlationId,
  status: 200,
  duration_ms: 145
});

// 4. Loguear inicio y fin de operaciones
log.info('Upload started', { filename: 'policies.csv' });
// ... operación ...
log.info('Upload completed', { inserted: 100, rejected: 5 });
```

### ❌ NO HACER

```typescript
// 1. NO loguear información sensible
logger.info('User login', { password: '12345' });  // ❌

// 2. NO loguear en loops intensos
for (let i = 0; i < 10000; i++) {
  logger.debug(`Processing item ${i}`);  // ❌ Genera millones de logs
}

// 3. NO usar console.log
console.log('Starting process');  // ❌ Usar logger.info()

// 4. NO loguear objetos enormes
logger.info('Data loaded', { data: hugeArray });  // ❌ Archivo gigante
```

---

## Consulta de Logs

### Ver logs en tiempo real

```bash
# Linux/Mac
tail -f backend/logs/combined.log

# Windows PowerShell
Get-Content backend/logs/combined.log -Wait -Tail 50
```

### Buscar por correlation ID

```bash
# Encontrar todos los logs de una operación
grep "abc123" backend/logs/combined.log

# Con contexto (líneas antes y después)
grep -C 5 "abc123" backend/logs/combined.log
```

### Ver solo errores

```bash
cat backend/logs/error.log

# Últimos 50 errores
tail -50 backend/logs/error.log
```

### Analizar logs JSON con jq

```bash
# Filtrar por nivel
jq 'select(.level == "error")' backend/logs/combined.log

# Filtrar por correlation_id
jq 'select(.correlation_id == "abc123")' backend/logs/combined.log

# Extraer solo mensajes
jq '.message' backend/logs/combined.log
```

---

## Integración con Servicios Externos

### Azure Application Insights (Recomendado para Producción)

```typescript
import { ApplicationInsights } from '@azure/monitor-opentelemetry';

const appInsights = new ApplicationInsights({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
});

// Winston transportará automáticamente a App Insights
```

### Otros Servicios

- **Datadog:** `npm install winston-datadog`
- **Loggly:** `npm install winston-loggly-bulk`
- **CloudWatch:** `npm install winston-cloudwatch`

---

## Troubleshooting

### Problema: Los logs no se guardan

**Solución 1:** Verificar permisos del directorio
```bash
ls -la backend/logs
chmod 755 backend/logs
```

**Solución 2:** Verificar espacio en disco
```bash
df -h
```

### Problema: Archivos de log muy grandes

**Solución:** Reducir nivel de logging en producción
```env
LOG_LEVEL=warn  # Solo warn y error
```

### Problema: No encuentro el directorio de logs

**Verificar ubicación según entorno:**
```bash
# Ver donde se guardan
node -e "console.log(require('path').join(__dirname, 'logs'))"
```

---

## Monitoreo y Alertas

### Recomendaciones

1. **Alertas de errores críticos**
   - Enviar notificación si `error.log` crece > 1MB en 1 hora
   - Alerta si hay > 100 errores/minuto

2. **Limpieza automática**
   ```bash
   # Cron job para eliminar logs > 30 días
   0 0 * * * find /var/log/challenge-tekne -name "*.log.*" -mtime +30 -delete
   ```

3. **Dashboard de logs** (con Grafana + Loki)
   - Gráfico de errores por hora
   - Top 10 errores más frecuentes
   - Latencia promedio por endpoint

---

## Ejemplos de Uso en el Proyecto

### 1. Middleware de Requests

```typescript
// src/index.ts
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    logger.info(`${req.method} ${req.path}`, {
      correlation_id: req.correlationId,
      status: res.statusCode,
      duration_ms: Date.now() - start
    });
  });

  next();
});
```

### 2. Upload Controller

```typescript
// src/controllers/UploadController.ts
const log = createContextLogger({
  correlation_id: req.correlationId,
  operation_id: uuid()
});

log.info('Upload started', { filename: file.originalname });

try {
  const result = await processCSV(file);
  log.info('Upload completed', {
    inserted: result.inserted,
    rejected: result.rejected
  });
} catch (error) {
  log.error('Upload failed', { error: error.message });
}
```

### 3. AI Insights Service

```typescript
// src/services/AIInsightsService.ts
console.log('[AIInsights] Llamando a Gemini API con', policies.length, 'pólizas...');

// Actualmente usa console.log, debería usar:
logger.info('Calling Gemini API', {
  policies_count: policies.length,
  filters: filters
});
```

---

## Migración de console.log a logger

### Buscar todos los console.log

```bash
grep -r "console.log" backend/src --include="*.ts"
```

### Reemplazar gradualmente

```typescript
// Antes
console.log('Server started');
console.error('Error:', error);

// Después
logger.info('Server started');
logger.error('Error occurred', { error: error.message });
```

---

## Conclusión

El sistema de logging está configurado para:
- ✅ **Desarrollo:** Logs legibles en consola
- ✅ **Producción:** Logs estructurados en archivos rotativos
- ✅ **Trazabilidad:** Correlation IDs en todas las operaciones
- ✅ **Escalabilidad:** Listo para integrar con servicios de logging en la nube

**Próximos pasos recomendados:**
1. Migrar todos los `console.log` a `logger`
2. Agregar más contexto a los logs existentes
3. Implementar alertas para errores críticos
4. Considerar Azure Application Insights para producción
