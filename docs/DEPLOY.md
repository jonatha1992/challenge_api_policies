# Deployment Guide

## Deployment con Docker (Desarrollo Local)

### Quick Start

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/challenge_tekne.git
cd challenge_tekne

# 2. Crear archivo .env desde el ejemplo
cp .env.example .env

# 3. Levantar todos los servicios
docker-compose up -d

# 4. Verificar que están corriendo
docker-compose ps

# 5. Ver logs
docker-compose logs -f
```

**Servicios disponibles:**
- Frontend: http://localhost:80
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

### Arquitectura Docker

```
docker-compose up
    ├─ postgres (PostgreSQL 14-alpine)
    │   ├─ Puerto: 5432
    │   ├─ Volume: postgres_data (persistente)
    │   └─ Health check: pg_isready
    │
    ├─ backend (Node.js 18-alpine)
    │   ├─ Puerto: 3000
    │   ├─ Depends on: postgres (healthy)
    │   ├─ Multi-stage build (builder → production)
    │   ├─ Usuario no-root (nodejs:1001)
    │   └─ Health check: GET /health
    │
    └─ frontend (Nginx alpine)
        ├─ Puerto: 80
        ├─ Depends on: backend
        ├─ Multi-stage build (Vite → Nginx)
        └─ Sirve assets estáticos optimizados
```

### Variables de Entorno (.env)

```env
# Database
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=challenge_tekne
DB_PORT=5432

# Backend
BACKEND_PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Frontend
FRONTEND_PORT=80
VITE_API_URL=http://localhost:3000

# AI (Optional)
GEMINI_API_KEY=
```

### Comandos Útiles

```bash
# Reconstruir imágenes
docker-compose build

# Reconstruir sin cache
docker-compose build --no-cache

# Ver logs de un servicio específico
docker-compose logs -f backend

# Ejecutar comando en un contenedor
docker-compose exec backend sh

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (CUIDADO: borra la BD)
docker-compose down -v

# Restart de un servicio
docker-compose restart backend

# Ver métricas
docker stats
```

### Verificación de Salud

```bash
# Health check del backend
curl http://localhost:3000/health | jq

# Diagnóstico completo
curl http://localhost:3000/config/validate | jq

# Health check del frontend
curl http://localhost:80/health
```

### Troubleshooting

**Error: "port is already allocated"**
```bash
# Cambiar puertos en .env
BACKEND_PORT=3001
FRONTEND_PORT=8080
```

**Error: "database connection refused"**
```bash
# Verificar que postgres está healthy
docker-compose ps

# Ver logs de postgres
docker-compose logs postgres

# Reiniciar postgres
docker-compose restart postgres
```

**Error: "ECONNREFUSED" en frontend**
```bash
# Verificar que VITE_API_URL apunta al backend correcto
# Si usas puertos custom, actualizar .env
VITE_API_URL=http://localhost:3001

# Reconstruir frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Optimizaciones de Producción

**Multi-stage builds** ya implementados:
- ✅ Reduce tamaño de imágenes 60-70%
- ✅ Solo production dependencies
- ✅ No expone código fuente TypeScript

**Security hardening:**
- ✅ Contenedores corren como usuario no-root
- ✅ Health checks para auto-recuperación
- ✅ Secrets via variables de entorno

---

## Deployment en Azure (Producción)

## ✅ Arquitectura CORRECTA para el Challenge (SIMPLE)

El challenge pide un **sistema simple** de gestión de pólizas. La arquitectura correcta es:

```
┌─────────────────┐
│   Azure CDN     │  ← Static Web App (Frontend)
│  (Frontend)     │
└────────┬────────┘
         │
┌────────▼────────┐
│  App Service    │  ← Backend Node.js/Express (MONOLÍTICO)
│   (Backend)     │
│ • /upload       │
│ • /policies     │
│ • /ai/insights  │
│ • /health       │
└────────┬────────┘
         │
┌────────▼────────┐
│  PostgreSQL     │  ← Base de datos
│   Flexible      │
└────────┬────────┘
         │
┌────────▼────────┐
│  Key Vault      │  ← Secrets (opcional)
│  (Secrets)      │
└─────────────────┘
```

### ¿Por qué esta arquitectura es correcta?

1. **Challenge pide simplicidad**: Un backend monolítico con Express, no microservicios
2. **Fácil de mantener**: Un solo App Service maneja todos los endpoints
3. **Costo-efectivo**: Menos recursos Azure que mantener
4. **Suficiente para el scope**: El challenge no requiere alta escalabilidad

## Recursos Azure CORRECTOS

### 1. Azure App Service (Backend)

**Configuracion:**

- Runtime: Node.js 18 LTS
- Plan: Basic B1 (desarrollo) o Standard S1 (produccion)
- Region: East US 2 (o la mas cercana)

**Beneficios:**

- Fácil de configurar y mantener
- Auto-scaling disponible
- Integración nativa con PostgreSQL y Key Vault
- Mejor para aplicaciones monolíticas

**Configuracion recomendada:**

```json
{
  "name": "challenge-tekne-backend",
  "type": "Microsoft.Web/sites",
  "properties": {
    "serverFarmId": "/subscriptions/.../resourceGroups/.../providers/Microsoft.Web/serverfarms/challenge-tekne-plan",
    "siteConfig": {
      "linuxFxVersion": "NODE|18-lts",
      "alwaysOn": true,
      "cors": {
        "allowedOrigins": ["https://challenge-tekne-frontend.azurestaticapps.net"]
      }
    }
  }
}
```

### 2. Azure Database for PostgreSQL - Flexible Server

**Tier recomendado:**

- **Desarrollo:** Burstable B1ms (1 vCore, 2GB RAM) - ~$15/mes
- **Produccion:** General Purpose D2s_v3 (2 vCores, 8GB RAM) - ~$100/mes

**Configuracion:**

- High Availability: Zone redundant (produccion)
- Backup retention: 7 dias (desarrollo), 35 dias (produccion)
- SSL: Enabled (required)

**Connection string:**

```
postgresql://user:password@server.postgres.database.azure.com:5432/challenge_tekne?sslmode=require
```

### 3. Azure Key Vault

**Secrets a almacenar:**

- `DB-CONNECTION-STRING`: PostgreSQL connection string
- `GEMINI-API-KEY`: API key de Google Gemini (opcional)
- `APP-INSIGHTS-KEY`: Instrumentation key

**Acceso:**

- Managed Identity para Azure App Service
- No exponer secrets en codigo o variables de entorno

**Ejemplo de acceso:**

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const client = new SecretClient("https://vault-name.vault.azure.net/", credential);
const secret = await client.getSecret("DB-CONNECTION-STRING");
```

### 4. Azure Application Insights

**Metricas custom a enviar:**

- `upload_duration_ms`: Tiempo de procesamiento de uploads
- `rows_inserted`: Filas insertadas por operacion
- `rows_rejected`: Filas rechazadas por operacion
- `insights_generation_time`: Tiempo de generacion de insights

**Logs estructurados:**

```typescript
const appInsights = require("applicationinsights");
appInsights.defaultClient.trackEvent({
  name: "UploadCompleted",
  properties: {
    correlation_id: "...",
    operation_id: "...",
    inserted: 100,
    rejected: 5
  }
});
```

**Alertas recomendadas:**

- Error rate > 5% en 5 minutos
- Latencia P95 > 5s
- Failures en /upload

### 5. Azure Static Web Apps (Frontend)

**Configuracion:**

- Build: `npm run build`
- Output: `dist`
- API location: `https://challenge-tekne-backend.azurewebsites.net`

**staticwebapp.config.json:**

```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"],
      "rewrite": "/api"
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "globalHeaders": {
    "api-url": "https://challenge-tekne-backend.azurewebsites.net"
  }
}
```

## CI/CD Pipeline

### GitHub Actions

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

env:
  AZURE_WEBAPP_NAME: challenge-tekne-backend
  AZURE_STATICWEBAPP_NAME: challenge-tekne-frontend

jobs:
  build-and-deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install and build
        working-directory: ./backend
        run: |
          npm ci
          npm run build

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: ./backend

  build-and-deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build frontend
        working-directory: ./frontend
        run: |
          npm ci
          npm run build

      - name: Deploy to Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "./frontend"
          output_location: "dist"

  run-migrations:
    needs: [build-and-deploy-backend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          psql $DATABASE_URL -f database/migrations/001_create_tables.sql
```

## Variables de Entorno en Azure

### Azure App Service Application Settings

| Variable | Valor | Fuente |
|----------|-------|--------|
| `DB_HOST` | `@Microsoft.KeyVault(...)` | Key Vault reference |
| `DB_PASSWORD` | `@Microsoft.KeyVault(...)` | Key Vault reference |
| `GEMINI_API_KEY` | `@Microsoft.KeyVault(...)` | Key Vault reference |
| `APPINSIGHTS_INSTRUMENTATIONKEY` | (auto-configured) | App Insights |
| `NODE_ENV` | `production` | Direct |
| `PORT` | `8080` | Direct |

## Estimacion de Costos

### Desarrollo/Testing

| Recurso | Tier | Costo/mes |
|---------|------|-----------|
| Azure App Service | Basic B1 | ~$15 |
| PostgreSQL | B1ms | ~$15 |
| Key Vault | Standard | ~$1 |
| App Insights | Free tier | $0 |
| Static Web Apps | Free | $0 |
| **Total** | | **~$31/mes** |

## Checklist de Deployment

- [ ] Crear Resource Group
- [ ] Provisionar PostgreSQL Flexible Server
- [ ] Crear Key Vault y agregar secrets
- [ ] Crear Azure App Service (Basic B1 para desarrollo)
- [ ] Configurar Managed Identity en App Service
- [ ] Ejecutar migraciones de DB
- [ ] Configurar App Insights
- [ ] Deploy backend a App Service
- [ ] Deploy frontend a Static Web Apps
- [ ] Configurar dominio custom (opcional)
- [ ] Configurar alertas
- [ ] Verificar health checks

## Rollback Strategy

1. **App Service:** Azure mantiene historial de deployments, rollback desde portal o CLI
2. **Database:** Point-in-time restore disponible
3. **Frontend:** Re-deploy version anterior desde GitHub Actions

