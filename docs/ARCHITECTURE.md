# Arquitectura del Sistema - Challenge Tekne

## Visión General

Sistema full-stack para gestión de pólizas de seguros con validación, trazabilidad y análisis con IA.

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React + Vite + TypeScript                                  │
│  - Health Check Monitor (30s polling)                       │
│  - ENV Validation al inicio                                 │
│  - Nginx (producción)                                       │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/REST
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│  Node.js + Express + TypeScript                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Middlewares                                        │   │
│  │  - CORS                                             │   │
│  │  - Correlation ID                                   │   │
│  │  - Logging (Winston)                                │   │
│  │  - Multer (Upload)                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Controllers                                        │   │
│  │  - UploadController                                 │   │
│  │  - PolicyController                                 │   │
│  │  - AIController                                     │   │
│  │  - DiagnosticController                             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Services                                           │   │
│  │  - PolicyService (CRUD)                             │   │
│  │  - ValidationService (Técnicas)                     │   │
│  │  - OperationService (Trazabilidad)                  │   │
│  │  - AIInsightsService (Gemini/Local)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Rules Engine (OOP)                                 │   │
│  │  - BusinessRule (Abstract)                          │   │
│  │  - PropertyMinInsuredValueRule                      │   │
│  │  - AutoMinInsuredValueRule                          │   │
│  │  - RuleEngine (Polimorfismo)                        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │ PostgreSQL Protocol
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                               │
│  PostgreSQL 14+                                             │
│  - policies (pólizas)                                       │
│  - operations (trazabilidad)                                │
│  - UNIQUE constraint en policy_number                       │
│  - ON CONFLICT DO UPDATE (idempotencia)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Capa de Presentación (Frontend)

### Tecnologías
- **React 18** - UI Library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Axios** - HTTP client
- **React Router** - SPA routing

### Componentes Principales

**Pages:**
- `Upload.tsx` - Carga de CSV con drag & drop
- `Policies.tsx` - Lista paginada con filtros
- `Summary.tsx` - Dashboard con estadísticas

**Hooks:**
- `useBackendHealth.ts` - Monitoreo continuo del backend

**Services:**
- `api.ts` - Cliente centralizado de API

### Flujo de Validación Frontend

```
Usuario inicia app
       ▼
validateEnv() - Verifica VITE_API_URL
       ▼
useBackendHealth() - Llama /health
       ▼
Polling cada 30s
       ▼
Si falla: Muestra error + "Retry Connection"
```

---

## Capa de Aplicación (Backend)

### Arquitectura en Capas

```
HTTP Request
    ▼
Middlewares (CORS, Correlation ID, Logging)
    ▼
Controllers (Validación de requests, orquestación)
    ▼
Services (Lógica de negocio)
    ▼
Rules Engine (Validaciones de negocio OOP)
    ▼
Database (Persistencia)
```

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/upload` | Carga CSV + validación + detección duplicados |
| GET | `/policies` | Lista con filtros y paginación |
| GET | `/policies/summary` | Estadísticas agregadas |
| POST | `/ai/insights` | Análisis con IA |
| GET | `/health` | Health check + DB connection |
| GET | `/config/validate` | Diagnóstico completo |

### Patrones de Diseño

**1. Strategy Pattern (Rules Engine)**

```typescript
abstract class BusinessRule {
  abstract appliesTo(policy: Policy): boolean;
  abstract validate(policy: Policy): ValidationResult;
}

class PropertyMinInsuredValueRule extends BusinessRule {
  appliesTo(policy: Policy): boolean {
    return policy.policy_type === 'Property';
  }

  validate(policy: Policy): ValidationResult {
    return policy.insured_value_usd >= 5000
      ? { valid: true }
      : { valid: false, code: 'PROPERTY_VALUE_TOO_LOW' };
  }
}
```

**Beneficios:**
- ✅ Open/Closed Principle - agregar reglas sin modificar el motor
- ✅ Polimorfismo - RuleEngine trabaja con abstracción
- ✅ Testing unitario fácil

**2. Repository Pattern (PolicyService)**

Abstrae el acceso a datos:
```typescript
class PolicyService {
  async insertPolicy(policy: Policy): Promise<...>
  async findAll(filters: PolicyFilters): Promise<...>
  async getSummary(): Promise<...>
}
```

**3. Middleware Pattern (Express)**

Pipeline de procesamiento:
```typescript
app.use(cors());
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(loggingMiddleware);
```

---

## Capa de Persistencia

### Esquema de Base de Datos

**Tabla: policies**
```sql
CREATE TABLE policies (
  id SERIAL PRIMARY KEY,
  policy_number VARCHAR(50) UNIQUE NOT NULL,
  customer VARCHAR(255) NOT NULL,
  policy_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  premium_usd DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  insured_value_usd DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Tabla: operations**
```sql
CREATE TABLE operations (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  endpoint VARCHAR(100),
  status VARCHAR(20),
  correlation_id UUID,
  rows_inserted INTEGER,
  rows_updated INTEGER,
  rows_rejected INTEGER,
  duration_ms INTEGER,
  error_summary TEXT
);
```

### Idempotencia con UPSERT

```sql
INSERT INTO policies (...)
VALUES (...)
ON CONFLICT (policy_number) DO UPDATE SET
  customer = EXCLUDED.customer,
  ...
RETURNING *, (xmax = 0) AS was_insert
```

**Detección INSERT vs UPDATE:**
- `xmax = 0` → fue INSERT nuevo
- `xmax > 0` → fue UPDATE de existente

---

## Trazabilidad y Observabilidad

### Correlation ID

Cada request recibe un UUID único:
```typescript
// Middleware
req.correlationId = req.headers['x-correlation-id'] || uuidv4();
res.setHeader('x-correlation-id', req.correlationId);
```

**Beneficios:**
- Rastreo end-to-end en logs
- Debugging de requests distribuidos
- Compatible con Azure App Insights

### Logging Estructurado (Winston)

```typescript
logger.info('Upload completed', {
  correlation_id: correlationId,
  operation_id: operation.id,
  inserted: insertedCount,
  updated: updatedCount,
  duration_ms: duration
});
```

**Niveles:**
- `error` - Errores críticos
- `warn` - Advertencias (ENV opcionales faltantes)
- `info` - Operaciones normales
- `debug` - Información detallada

---

## Inteligencia Artificial

### Arquitectura Híbrida

```
AIInsightsService
    ├─ Google Gemini (si GEMINI_API_KEY existe)
    │   ├─ Modelo: gemini-1.5-flash
    │   └─ Análisis avanzado en la nube
    └─ Análisis Local (fallback)
        ├─ Estadísticas en memoria
        └─ Reglas heurísticas
```

### Flujo del Endpoint POST /ai/insights

**Arquitectura de Capas (NO acceso directo a BD):**

```
1. Frontend
   ↓ POST /ai/insights
   Body: {"filters": {"status": "active", "policy_type": "Property"}}

2. AIController (HTTP Layer)
   ↓
   - Recibe filtros del frontend
   - NO recibe las pólizas en el body
   - Valida y parsea filtros

3. PolicyService (Data Access Layer)
   ↓
   - findAll(filters) → Consulta BD con filtros
   - getSummary() → Obtiene estadísticas agregadas
   - Retorna datos al controlador

4. AIInsightsService (Business Logic)
   ↓
   - Recibe pólizas y resumen del controlador
   - Genera insights usando Gemini o análisis local
   - Retorna insights al controlador

5. AIController
   ↓
   Retorna JSON al frontend con insights generados
```

**¿Por qué NO es arriesgado que el backend acceda a la BD?**

✅ **Usa Repository Pattern**: AIController NO ejecuta SQL directamente, usa PolicyService como abstracción
✅ **Separation of Concerns**: Cada capa tiene una responsabilidad única
✅ **Seguridad**: Frontend no puede manipular datos enviando información falsa
✅ **Performance**: Solo envía filtros (~100 bytes) en lugar de miles de pólizas (~megabytes)
✅ **Datos Actualizados**: Siempre consulta la fuente de verdad (base de datos)
✅ **Reutilización**: PolicyService se usa en múltiples controladores
✅ **Testeable**: Fácil hacer mocking de PolicyService en tests unitarios

**Alternativa INCORRECTA (antipatrón):**

```
❌ Frontend obtiene 10,000 pólizas de GET /policies
❌ Frontend envía las 10,000 pólizas en POST /ai/insights
   Body: {"policies": [{...}, {...}, ...]}  ← Megabytes de datos
❌ Backend procesa datos del frontend sin verificar con BD
   → Datos pueden estar manipulados/desactualizados
   → Mucho tráfico de red innecesario
   → Vulnerable a manipulación de datos
```

**Decisión de Diseño: ¿Por qué el frontend solo envía filtros?**

1. **Principio de Single Source of Truth**: La base de datos es la fuente de verdad, no el frontend
2. **Seguridad**: El backend valida permisos y accesos antes de consultar datos
3. **Eficiencia**: Reducir payload de red (filtros vs datos completos)
4. **Escalabilidad**: El backend puede optimizar queries con índices, caching, etc.
5. **Consistencia**: Garantiza que los insights se generan sobre datos actuales

### Prompt Engineering

El sistema construye prompts estructurados:
```
Eres un analista de seguros experto.

Portfolio actual:
- Total pólizas: 120
- Premium total: $150,000 USD
- Distribución por tipo: Property 60%, Auto 30%, ...

Analiza este portfolio y proporciona:
1. Riesgos/anomalías detectadas
2. 2-3 recomendaciones accionables
```

---

## Seguridad (Ver docs/SECURITY.md)

### Capas de Seguridad

1. **Validación ENV** - Sistema no inicia sin configuración válida
2. **Health Checks** - Monitoreo continuo
3. **Validación de Entrada** - Sanitización de todos los inputs
4. **Contenedores No-Root** - Principio de menor privilegio
5. **Headers de Seguridad** - XSS, Clickjacking, etc.

---

## Despliegue (Docker)

### Arquitectura de Contenedores

```
docker-compose up
    ├─ postgres (PostgreSQL 14-alpine)
    │   ├─ Health check: pg_isready
    │   └─ Volume: postgres_data
    ├─ backend (Node.js 18-alpine)
    │   ├─ Depends on: postgres (healthy)
    │   ├─ Multi-stage build
    │   ├─ Usuario no-root (nodejs:1001)
    │   └─ Health check: GET /health
    └─ frontend (Nginx alpine)
        ├─ Depends on: backend
        ├─ Multi-stage build (Vite → Nginx)
        └─ Health check: wget /health
```

### Orquestación

- **Desarrollo:** `docker-compose up`
- **Producción:** Azure Container Instances / App Service
- **CI/CD:** GitHub Actions

---

## Escalabilidad

### Estrategias Implementadas

1. **Paginación** - Limit/Offset en queries
2. **Connection Pooling** - pg Pool con max 20 conexiones
3. **Health Checks** - Auto-recuperación de contenedores

### Mejoras Futuras

1. **Horizontal Scaling**
   - Múltiples instancias del backend detrás de load balancer
   - Stateless design permite escalar sin problemas

2. **Caching**
   - Redis para `/policies/summary`
   - Cache de resultados de IA

3. **Async Processing**
   - Bull Queue para uploads grandes
   - Workers separados para validación

4. **Database Optimization**
   - Índices en campos frecuentemente filtrados
   - Read replicas para consultas
   - Partitioning de tabla `operations` por fecha

---

## Conclusión

El sistema sigue principios SOLID y patrones de diseño probados:
- ✅ **Single Responsibility** - Cada clase tiene un propósito único
- ✅ **Open/Closed** - Extensible sin modificar código existente
- ✅ **Liskov Substitution** - Polimorfismo en RuleEngine
- ✅ **Interface Segregation** - Interfaces pequeñas y específicas
- ✅ **Dependency Inversion** - Dependencias via abstracción

La arquitectura permite:
- 📈 Escalabilidad horizontal
- 🔧 Mantenibilidad y testabilidad
- 🛡️ Seguridad en múltiples capas
- 📊 Observabilidad completa
