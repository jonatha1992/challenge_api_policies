# GitHub Actions CI/CD - Guía Completa

Este documento explica el pipeline de CI/CD configurado para el proyecto.

---

## 📋 Tabla de Contenidos

- [Resumen del Pipeline](#resumen-del-pipeline)
- [Configuración](#configuración)
- [Jobs del Pipeline](#jobs-del-pipeline)
- [Imágenes Docker](#imágenes-docker)
- [Secrets Requeridos](#secrets-requeridos)
- [Badges](#badges)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Resumen del Pipeline

El pipeline se ejecuta **automáticamente** en:
- ✅ Push a la rama `main`
- ✅ Pull Requests hacia `main`

**Ubicación:** `.github/workflows/ci-cd.yml`

---

## 🔄 Flujo del Pipeline

```
Push to main
     │
     ▼
┌────────────────────────────┐
│ 1. Test Backend            │
│    • npm install           │
│    • npm run lint          │
│    • npm test              │
│    • Upload coverage       │
└─────────────┬──────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
┌─────────────┐   ┌──────────────┐
│ 2. Build    │   │ 3. Build     │
│    Backend  │   │    Frontend  │
│             │   │              │
│ • Docker    │   │ • Docker     │
│   build     │   │   build      │
│ • Push GHCR │   │ • Push GHCR  │
└──────┬──────┘   └──────┬───────┘
       │                 │
       └────────┬────────┘
                │
                ▼
     ┌──────────────────────┐
     │ 4. Security Scan     │
     │    • Trivy scan      │
     │    • Upload SARIF    │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ 5. Deploy            │
     │    (Opcional)        │
     └──────────────────────┘
```

---

## 🛠️ Jobs del Pipeline

### Job 1: Test Backend

**Propósito:** Ejecutar tests y validaciones del backend

**Pasos:**
1. Checkout del código
2. Setup Node.js 18
3. Instalar dependencias con `npm ci`
4. Ejecutar linter (`npm run lint`)
5. Ejecutar tests (`npm test`)
6. Subir reporte de coverage a Codecov

**Variables de entorno:**
```yaml
NODE_ENV: test
DB_HOST: localhost
DB_PORT: 5432
DB_NAME: test_db
DB_USER: postgres
DB_PASSWORD: postgres
```

**Resultado:** Si falla, el pipeline se detiene aquí.

---

### Job 2: Build Backend Docker Image

**Propósito:** Construir y publicar imagen Docker del backend

**Condiciones:**
- ✅ Job `test-backend` debe completarse exitosamente
- ✅ Solo en push a `main` (no en PRs)

**Pasos:**
1. Checkout del código
2. Setup Docker Buildx
3. Login a GitHub Container Registry (GHCR)
4. Extraer metadata (tags, labels)
5. Build y push de imagen

**Plataformas:**
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM)

**Tags generados:**
```
ghcr.io/jonatha1992/challenge_teknet/backend:main
ghcr.io/jonatha1992/challenge_teknet/backend:main-abc1234
ghcr.io/jonatha1992/challenge_teknet/backend:latest
```

**Cache:** Usa GitHub Actions cache para builds rápidos

---

### Job 3: Build Frontend Docker Image

**Propósito:** Construir y publicar imagen Docker del frontend

**Condiciones:**
- ✅ Job `test-backend` debe completarse exitosamente
- ✅ Solo en push a `main` (no en PRs)

**Pasos:**
1. Checkout del código
2. Setup Docker Buildx
3. Login a GHCR
4. Extraer metadata
5. Build y push con build args

**Build Args:**
```dockerfile
VITE_API_URL=http://localhost:3000
```

**Plataformas:**
- `linux/amd64`
- `linux/arm64`

**Tags generados:**
```
ghcr.io/jonatha1992/challenge_teknet/frontend:main
ghcr.io/jonatha1992/challenge_teknet/frontend:main-abc1234
ghcr.io/jonatha1992/challenge_teknet/frontend:latest
```

---

### Job 4: Security Scan

**Propósito:** Escanear imágenes Docker en busca de vulnerabilidades

**Condiciones:**
- ✅ Jobs `build-backend` y `build-frontend` completados
- ✅ Solo en push a `main`

**Herramienta:** Trivy (Aqua Security)

**Pasos:**
1. Checkout del código
2. Ejecutar Trivy en imagen del backend
3. Generar reporte SARIF
4. Subir a GitHub Security

**Severidades detectadas:**
- 🔴 CRITICAL
- 🟠 HIGH

**Resultado:** Los resultados aparecen en:
`Security > Code scanning alerts`

---

### Job 5: Deploy (Opcional)

**Propósito:** Desplegar a producción

**Condiciones:**
- ✅ Todos los jobs anteriores completados
- ✅ Solo en push a `main`
- ✅ Solo si el owner del repo es `jonatha1992`
- ✅ Requiere environment `production`

**Pasos:**
1. Checkout del código
2. Notificación de deployment
3. Deploy a Azure (comentado, requiere configuración)
4. Notificación de éxito

**Environment:**
```yaml
name: production
url: ${{ secrets.PRODUCTION_URL }}
```

---

## 🐳 Imágenes Docker

### Backend

```bash
# Descargar imagen
docker pull ghcr.io/jonatha1992/challenge_teknet/backend:latest

# Ejecutar localmente
docker run -d \
  -p 3000:3000 \
  -e DB_HOST=postgres \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_NAME=challenge_teknet \
  ghcr.io/jonatha1992/challenge_teknet/backend:latest

# Ver logs
docker logs -f <container_id>
```

### Frontend

```bash
# Descargar imagen
docker pull ghcr.io/jonatha1992/challenge_teknet/frontend:latest

# Ejecutar localmente
docker run -d \
  -p 80:80 \
  ghcr.io/jonatha1992/challenge_teknet/frontend:latest

# Acceder en el navegador
http://localhost
```

### Docker Compose con Imágenes Publicadas

```yaml
version: '3.8'

services:
  backend:
    image: ghcr.io/jonatha1992/challenge_teknet/backend:latest
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_USER: postgres
      DB_PASSWORD: postgres

  frontend:
    image: ghcr.io/jonatha1992/challenge_teknet/frontend:latest
    ports:
      - "80:80"
```

---

## 🔑 Secrets Requeridos

### Automáticos (GitHub provee)

| Secret | Descripción | Scope |
|--------|-------------|-------|
| `GITHUB_TOKEN` | Token de autenticación para GHCR | Automático |

### Opcionales (para deployment)

| Secret | Descripción | Cómo obtener |
|--------|-------------|--------------|
| `PRODUCTION_URL` | URL de producción | Configurar en Settings > Environments > production |
| `VITE_API_URL` | URL del backend para frontend | Configurar en Settings > Secrets |
| `AZURE_WEBAPP_NAME` | Nombre del Azure Web App | Portal de Azure |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Perfil de publicación | Portal de Azure > Download publish profile |

### Configurar Secrets

1. Ve a tu repositorio en GitHub
2. Click en `Settings` > `Secrets and variables` > `Actions`
3. Click en `New repository secret`
4. Agregar nombre y valor
5. Click en `Add secret`

---

## 📊 Badges

Agrega badges al `README.md` para mostrar el estado del pipeline:

### CI/CD Status Badge

```markdown
![CI/CD](https://github.com/jonatha1992/challenge_teknet/workflows/CI%2FCD%20Pipeline/badge.svg?branch=main)
```

### Docker Image Badges

```markdown
![Backend](https://ghcr-badge.egpl.dev/jonatha1992/challenge_teknet/backend/latest_tag?color=%2344cc11&ignore=latest&label=backend&trim=)
![Frontend](https://ghcr-badge.egpl.dev/jonatha1992/challenge_teknet/frontend/latest_tag?color=%2344cc11&ignore=latest&label=frontend&trim=)
```

### Coverage Badge

Si usas Codecov:

```markdown
![Coverage](https://codecov.io/gh/jonatha1992/challenge_teknet/branch/main/graph/badge.svg)
```

---

## 🛠️ Troubleshooting

### Error: "Resource not accessible by integration"

**Problema:** El workflow no tiene permisos para escribir en GHCR

**Solución:**
1. Ve a Settings > Actions > General
2. En "Workflow permissions", selecciona:
   - ✅ Read and write permissions
3. Guarda los cambios

---

### Error: "buildx failed with: ERROR: failed to solve"

**Problema:** Error en el build de Docker

**Solución:**
1. Verifica que el `Dockerfile` sea válido:
   ```bash
   docker build -t test ./backend
   ```
2. Revisa los logs del workflow para ver el error específico
3. Verifica que todas las dependencias estén en `package.json`

---

### Error: "Tests failed"

**Problema:** Los tests del backend fallan

**Solución:**
1. Ejecuta los tests localmente:
   ```bash
   cd backend
   npm test
   ```
2. Corrige los tests que fallan
3. Commit y push de nuevo

---

### Las imágenes no aparecen en GHCR

**Problema:** Las imágenes no se publican en GitHub Container Registry

**Solución:**
1. Verifica que el workflow haya corrido en la rama `main`
2. Verifica los permisos del GITHUB_TOKEN
3. Ve a `Settings > Packages` para ver las imágenes publicadas

---

### El job de Security Scan falla

**Problema:** Trivy encuentra vulnerabilidades críticas

**Solución:**
1. Revisa el reporte en `Security > Code scanning alerts`
2. Actualiza las dependencias vulnerables:
   ```bash
   npm audit fix
   ```
3. Si es una vulnerabilidad en la imagen base, actualiza la versión:
   ```dockerfile
   FROM node:18-alpine  # Actualizar a versión más reciente
   ```

---

## 🚀 Activar el Pipeline

### Primera vez

1. **Hacer push a main:**
   ```bash
   git add .
   git commit -m "feat: configure GitHub Actions CI/CD"
   git push origin main
   ```

2. **Ver el pipeline:**
   - Ve a tu repositorio en GitHub
   - Click en la pestaña `Actions`
   - Verás el workflow "CI/CD Pipeline" ejecutándose

3. **Esperar a que complete:**
   - ✅ Verde = Éxito
   - ❌ Rojo = Error (click para ver logs)

---

## 📝 Modificar el Pipeline

### Agregar un nuevo job

```yaml
my-custom-job:
  name: My Custom Job
  runs-on: ubuntu-latest
  needs: test-backend  # Espera a que test-backend termine

  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Do something
      run: echo "Hello World"
```

### Agregar validación de linter al frontend

```yaml
test-frontend:
  name: Frontend Tests
  runs-on: ubuntu-latest

  steps:
    - uses: actions/checkout@v4

    - uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json

    - name: Install dependencies
      working-directory: ./frontend
      run: npm ci

    - name: Run linter
      working-directory: ./frontend
      run: npm run lint
```

---

## 📚 Referencias

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Trivy Action](https://github.com/aquasecurity/trivy-action)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

**Última actualización:** 2026-02-05
