# Challenge Tekne - Full Stack DEV AI

Sistema de gestion de polizas de seguros con validacion, trazabilidad y analisis con IA.

## Tecnologias

- **Backend**: Node.js + Express + TypeScript
- **Base de Datos**: PostgreSQL
- **Frontend**: React + Vite + TypeScript
- **IA**: Google Gemini (opcional) o analisis local

## Estructura del Proyecto

```
challenge_teknet/
├── backend/           # API Node.js + Express
│   └── src/
│       ├── controllers/   # Controladores HTTP
│       ├── services/      # Logica de negocio
│       ├── rules/         # Motor de reglas OOP
│       ├── middleware/    # Correlation ID, etc.
│       └── types/         # Tipos TypeScript
├── frontend/          # React SPA
│   └── src/
│       ├── pages/        # Componentes de pagina
│       └── services/     # Cliente API
├── database/          # Migraciones SQL
└── docs/              # Documentacion del challenge
```

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn
- Docker (opcional, para PostgreSQL)

## Instalacion

### 1. Base de Datos

**Desarrollo Local (SQLite - Recomendado)**

```bash
# No requiere configuración adicional
# Se crea automáticamente al ejecutar el backend
```

**Produccion (Azure PostgreSQL)**

```bash
# Configurar variables en backend/.env
DB_HOST=tu-servidor.postgres.database.azure.com
DB_USER=tu-usuario
DB_PASSWORD=tu-password
DB_NAME=challenge_teknet
```

**Opcion Docker (PostgreSQL local)**

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
npm install
npm run test-db  # Probar conexión a BD
npm run dev      # Iniciar servidor desarrollo
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Probar Conexion a Base de Datos

### Desarrollo Local (SQLite)

```bash
cd backend
npm run test-db
```

### Produccion (Azure PostgreSQL)

```bash
cd backend
# Asegurate de configurar las variables en .env
npm run test-azure-db
```

### Solucion de Problemas

**Error: "no pg_hba.conf entry for host"**

- Ve al portal de Azure > PostgreSQL > Firewall
- Agrega tu IP pública o habilita "Allow access to Azure services"

**Error: Credenciales incorrectas**

- Verifica las variables en `backend/.env`
- Confirma que el usuario tenga permisos en la BD

# Ejecutar migraciones

psql -d challenge_teknet -f database/migrations/001_create_tables.sql

```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con las credenciales de tu DB
npm run dev
```

El servidor inicia en `http://localhost:3000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicacion inicia en `http://localhost:5173`

## Variables de Entorno

### Backend

```env
# Database (REQUIRED)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=challenge_teknet
DB_USER=postgres
DB_PASSWORD=postgres

# Server (REQUIRED)
PORT=3000

# Environment (OPTIONAL)
NODE_ENV=development
LOG_LEVEL=info

# AI Services (OPTIONAL)
GEMINI_API_KEY=AIza...
```

### Frontend

```env
# API Configuration (REQUIRED)
VITE_API_URL=http://localhost:3000
```

**IMPORTANTE**: Las variables de entorno del frontend deben empezar con `VITE_` para ser expuestas al cliente.

## Documentación Interactiva de la API (Swagger)

La API cuenta con documentación interactiva completa generada con Swagger/OpenAPI 3.0.

**Acceder a Swagger UI:**

```
http://localhost:3000/api
```

**Obtener especificación OpenAPI JSON:**

```
http://localhost:3000/api.json
```

### Características de Swagger UI

- 📖 Documentación completa de todos los endpoints
- 🧪 Probar requests directamente desde el navegador
- 📝 Ver esquemas de request/response
- ✨ Ejemplos de uso para cada endpoint
- 🔍 Filtrar endpoints por tags (Upload, Policies, AI Insights, Health)

## Endpoints API

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/upload` | Carga CSV de polizas (detecta duplicados) |
| GET | `/policies` | Lista polizas con paginacion y filtros |
| GET | `/policies/summary` | Estadisticas del portfolio |
| POST | `/ai/insights` | Genera insights con IA |
| GET | `/health` | Health check con verificacion de BD |
| GET | `/config/validate` | Diagnostico completo del sistema |

### POST /upload

Carga un archivo CSV de polizas. **Detecta automáticamente duplicados** (basado en policy_number) y los actualiza.

**Request:**

```
Content-Type: multipart/form-data
Body: file (CSV)
```

**Response:**

```json
{
  "operation_id": "uuid",
  "correlation_id": "uuid",
  "inserted_count": 8,
  "updated_count": 2,
  "rejected_count": 2,
  "errors": [
    {"row_number": 3, "field": "insured_value_usd", "code": "PROPERTY_VALUE_TOO_LOW"}
  ],
  "updated_policies": ["POL-001", "POL-005"]
}
```

**Campos de respuesta:**
- `inserted_count`: Pólizas nuevas insertadas
- `updated_count`: Pólizas existentes actualizadas (duplicados)
- `rejected_count`: Filas rechazadas por errores de validación
- `updated_policies`: Array de policy_numbers que fueron actualizados

**Comportamiento de duplicados:**
Si una póliza con el mismo `policy_number` ya existe, se actualizan todos sus campos con los nuevos valores del CSV.

### GET /policies

Lista polizas con filtros y paginacion.

**Query params:**

- `limit`: Max resultados (default 25, max 100)
- `offset`: Desplazamiento
- `status`: active, expired, cancelled
- `policy_type`: Property, Auto, Life, Health
- `q`: Busqueda por policy_number o customer

**Response:**

```json
{
  "items": [...],
  "pagination": {"limit": 25, "offset": 0, "total": 100}
}
```

### GET /policies/summary

Estadisticas agregadas del portfolio.

**Response:**

```json
{
  "total_policies": 100,
  "total_premium_usd": 150000,
  "count_by_status": {"active": 80, "expired": 15, "cancelled": 5},
  "premium_by_type": {"Property": 60000, "Auto": 50000, ...}
}
```

### POST /ai/insights

Genera insights basados en IA.

**Request:**

```json
{
  "filters": {"status": "active", "policy_type": "Property"}
}
```

**Response:**

```json
{
  "insights": ["Alta concentracion en polizas Property...", "Recomendacion: ..."],
  "highlights": {"total_policies": 100, "risk_flags": 2, "recommendations_count": 3}
}
```

### GET /health

Verifica el estado del servidor y la conexión a la base de datos.

**Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

**Response (503 Service Unavailable):**

```json
{
  "status": "error",
  "timestamp": "2025-01-15T10:30:00Z",
  "database": "disconnected",
  "error": "Connection refused"
}
```

### GET /config/validate

Endpoint de diagnóstico completo del sistema. Valida:
- Variables de entorno requeridas y opcionales
- Conexión a base de datos
- Versión de Node.js y métricas del runtime
- Estado de servicios (IA)

**Response (200 - healthy/degraded):**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "checks": {
    "environment": {
      "status": "ok",
      "missing_required": [],
      "missing_optional": ["GEMINI_API_KEY"]
    },
    "database": {
      "status": "ok",
      "connected": true,
      "version": "14.5"
    },
    "runtime": {
      "node_version": "v18.17.0",
      "platform": "linux",
      "uptime_seconds": 3600,
      "memory_usage_mb": {
        "used": 85,
        "total": 128
      }
    },
    "services": {
      "ai_enabled": false,
      "gemini_configured": false
    }
  }
}
```

**Response (503 - error):**

Retornado cuando faltan variables requeridas o la base de datos está desconectada.

**Status Values:**
- `healthy`: Todos los checks pasaron
- `degraded`: Sistema funcional pero faltan componentes opcionales
- `error`: Falla crítica que impide operación normal

## Sistema de Health Check y Validación

### Backend

El backend valida automáticamente todas las variables de entorno al iniciar. Si falta alguna variable requerida, el servidor no se iniciará y mostrará un mensaje de error claro.

```bash
❌ ENVIRONMENT VALIDATION FAILED

Missing required environment variables:
  - DB_HOST
  - DB_PASSWORD

Please check your .env file and ensure all required variables are set.
```

### Frontend

El frontend realiza dos validaciones al iniciar:

1. **Validación de ENV**: Verifica que `VITE_API_URL` esté configurado
2. **Health Check del Backend**: Llama a `/health` para verificar que el backend esté disponible

Si alguna validación falla, se muestra un mensaje de error claro al usuario con la opción de reintentar.

### Monitoreo Continuo

El frontend verifica la salud del backend cada 30 segundos. Si detecta que el backend está caído, muestra automáticamente un mensaje de error.

## Formato CSV

```csv
policy_number,customer,policy_type,start_date,end_date,premium_usd,status,insured_value_usd
POL-001,Acme Corp,Property,2025-01-01,2025-12-31,1200,active,5000
POL-002,Globex,Auto,2025-02-01,2026-01-31,800,active,15000
```

## Reglas de Validacion

### Tecnicas

- `policy_number` obligatorio
- `start_date` < `end_date`
- `status` debe ser: active, expired, cancelled
- `policy_type` debe ser: Property, Auto, Life, Health

### Negocio (OOP)

- **Property**: insured_value_usd >= $5,000
- **Auto**: insured_value_usd >= $10,000

## Variables de Entorno

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=challenge_teknet
DB_USER=postgres
DB_PASSWORD=postgres

# Server
PORT=3000
NODE_ENV=development

# AI (opcional)
GEMINI_API_KEY=AIza...

# Logging
LOG_LEVEL=info
```

## Testing

```bash
cd backend
npm test
```

## Scripts

**Backend:**

- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Compilar TypeScript
- `npm start` - Produccion

**Frontend:**

- `npm run dev` - Desarrollo
- `npm run build` - Build produccion
- `npm run preview` - Preview build

## Documentación

Este proyecto cuenta con documentación exhaustiva que cubre todos los aspectos del sistema:

### 📖 Guías Principales

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Arquitectura completa del sistema
  - Visión general del stack tecnológico
  - Capas de presentación, aplicación y persistencia
  - Patrones de diseño (Strategy, Repository, Middleware)
  - Diagramas de arquitectura
  - Estrategias de escalabilidad

- **[DEPLOY.md](docs/DEPLOY.md)** - Guía de deployment
  - Deployment con Docker (desarrollo local)
  - Deployment en Azure (producción)
  - Variables de entorno completas
  - CI/CD con GitHub Actions
  - Troubleshooting y comandos útiles

- **[SECURITY.md](docs/SECURITY.md)** - Capa de seguridad
  - Validación de variables de entorno
  - Health checks y monitoreo
  - Seguridad en Docker (non-root containers, multi-stage builds)
  - Protección de datos sensibles
  - Validación de entrada y headers de seguridad
  - Mejores prácticas implementadas

- **[AI.md](docs/AI.md)** - Integración con Inteligencia Artificial
  - Arquitectura híbrida (Google Gemini + fallback local)
  - Configuración de Gemini API
  - Prompt engineering
  - Costos y límites
  - Implementación del servicio AIInsightsService

- **[PLANNING.md](docs/PLANNING.md)** - Planning y proceso de desarrollo
  - Fases de implementación (Challenge base → Infraestructura → Dockerización)
  - Decisiones técnicas y arquitectónicas
  - Problemas identificados y soluciones implementadas
  - Timeline y métricas de progreso
  - Lecciones aprendidas

### 🎯 Inicio Rápido

Si es tu primera vez con el proyecto, sigue este orden:

1. **[README.md](README.md)** (este archivo) - Introducción y setup básico
2. **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Entender la arquitectura
3. **[DEPLOY.md](docs/DEPLOY.md)** - Levantar el proyecto con Docker
4. **[SECURITY.md](docs/SECURITY.md)** - Conocer las medidas de seguridad
5. **[AI.md](docs/AI.md)** - Configurar la integración con IA (opcional)

### 🔍 Recursos Adicionales

- **database/migrations/** - Scripts SQL de migraciones
- **sample-data/** - Archivos CSV de ejemplo para testing
- **.env.example** - Plantillas de variables de entorno (backend y frontend)

## Autor

Challenge Tekne - Full Stack DEV AI
