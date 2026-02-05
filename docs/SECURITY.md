# Capa de Seguridad - Challenge Tekne

Este documento describe las medidas de seguridad implementadas en el sistema de gestión de pólizas.

## Tabla de Contenidos

- [Validación de Variables de Entorno](#validación-de-variables-de-entorno)
- [Health Checks y Monitoreo](#health-checks-y-monitoreo)
- [Seguridad en Docker](#seguridad-en-docker)
- [Protección de Datos Sensibles](#protección-de-datos-sensibles)
- [Validación de Entrada](#validación-de-entrada)
- [Headers de Seguridad](#headers-de-seguridad)
- [Mejores Prácticas](#mejores-prácticas)

---

## Validación de Variables de Entorno

### Backend

**Archivo:** `backend/src/config/validateEnv.ts`

El backend valida **automáticamente** todas las variables de entorno al iniciar. Si falta alguna variable crítica, el servidor **no se inicia** y muestra un error claro.

**Variables Requeridas:**
- `DB_HOST` - Host de la base de datos
- `DB_PORT` - Puerto de PostgreSQL
- `DB_NAME` - Nombre de la base de datos
- `DB_USER` - Usuario de la base de datos
- `DB_PASSWORD` - Contraseña de la base de datos
- `PORT` - Puerto del servidor

**Variables Opcionales:**
- `GEMINI_API_KEY` - API key para Google Gemini (IA)
- `LOG_LEVEL` - Nivel de logging
- `NODE_ENV` - Entorno de ejecución

**Comportamiento:**
```typescript
// Si falta una variable requerida
❌ ENVIRONMENT VALIDATION FAILED

Missing required environment variables:
  - DB_PASSWORD

Please check your .env file and ensure all required variables are set.
```

**Validaciones:**
- ✅ Detecta valores `undefined`
- ✅ Detecta strings vacíos (`""`)
- ✅ Detecta strings con solo espacios (`"   "`)
- ✅ Diferencia entre requeridas (error) y opcionales (warning)

### Frontend

**Archivo:** `frontend/src/config/validateEnv.ts`

El frontend valida que `VITE_API_URL` esté configurado antes de inicializar la aplicación React.

**Variables Requeridas:**
- `VITE_API_URL` - URL del backend

**Comportamiento:**
Si falta la variable, se muestra un mensaje de error visual en el DOM con instrucciones claras.

**Seguridad:**
- ✅ Solo variables con prefijo `VITE_` son expuestas al cliente
- ✅ Secretos nunca se exponen en el frontend
- ✅ Validación antes de renderizar cualquier componente

---

## Health Checks y Monitoreo

### Health Check del Backend

**Endpoint:** `GET /health`

Verifica:
- ✅ Conexión a base de datos con query real (`SELECT 1`)
- ✅ Estado del servidor
- ✅ Versión de la aplicación

**Respuesta Exitosa (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

**Respuesta de Error (503 Service Unavailable):**
```json
{
  "status": "error",
  "timestamp": "2025-01-15T10:30:00Z",
  "database": "disconnected",
  "error": "Connection refused"
}
```

### Health Check del Frontend

El frontend realiza **dos verificaciones** al iniciar:

1. **Validación de ENV**: Verifica `VITE_API_URL`
2. **Health Check del Backend**: Llama a `/health`

**Monitoreo Continuo:**
- 🔄 Polling cada 30 segundos
- 🚨 Alerta automática si el backend está caído
- ♻️ Opción de "Retry Connection"

### Endpoint de Diagnóstico

**Endpoint:** `GET /config/validate`

Diagnóstico completo del sistema que verifica:
- ✅ Variables de entorno (requeridas/opcionales)
- ✅ Conexión a base de datos + versión PostgreSQL
- ✅ Runtime (Node.js version, memoria, uptime)
- ✅ Servicios (GEMINI_API_KEY configurado)

**Status Values:**
- `healthy` - Todos los checks pasaron
- `degraded` - Funcional pero faltan componentes opcionales
- `error` - Falla crítica que impide operación normal

**Uso en DevOps:**
```bash
# Verificar salud del sistema
curl http://localhost:3000/config/validate | jq

# Usar en CI/CD
if [ $(curl -s http://localhost:3000/health | jq -r '.status') != "ok" ]; then
  echo "Backend unhealthy, aborting deployment"
  exit 1
fi
```

---

## Seguridad en Docker

### Principio de Menor Privilegio

**Backend Dockerfile:**
```dockerfile
# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar ownership
RUN chown -R nodejs:nodejs /app

# Ejecutar como usuario no-root
USER nodejs
```

✅ **Beneficios:**
- El contenedor NO se ejecuta como root
- Si un atacante compromete el contenedor, tiene privilegios limitados
- Cumple con mejores prácticas de seguridad (CIS Docker Benchmark)

### Multi-Stage Builds

Ambos Dockerfiles usan **multi-stage builds**:

**Stage 1 (Build):**
- Incluye devDependencies
- Compila TypeScript/Vite
- Se descarta después del build

**Stage 2 (Production):**
- Solo dependencias de producción
- Código compilado
- Imagen final más pequeña y segura

✅ **Beneficios:**
- Reduce superficie de ataque (menos paquetes)
- Imágenes más livianas (menos vulnerabilidades)
- No expone código fuente TypeScript

### Health Checks en Docker

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "..."]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

✅ **Beneficios:**
- Docker reinicia contenedores unhealthy automáticamente
- Kubernetes/Swarm usa health checks para routing
- Previene enviar tráfico a contenedores degradados

### Secrets Management

**❌ NO hacer:**
```dockerfile
ENV DB_PASSWORD=mysecret  # NUNCA hardcodear secrets
```

**✅ Hacer:**
```yaml
# docker-compose.yml
environment:
  DB_PASSWORD: ${DB_PASSWORD}  # Desde .env
```

**Producción (Azure):**
```bash
# Usar Azure Key Vault
az keyvault secret set --vault-name mykeyvault --name DB-PASSWORD --value "..."

# Referenciar en App Service
DB_PASSWORD=@Microsoft.KeyVault(SecretUri=https://mykeyvault.vault.azure.net/secrets/DB-PASSWORD/)
```

---

## Protección de Datos Sensibles

### .gitignore

Archivos sensibles excluidos del repositorio:
```gitignore
.env
.env.local
.env.*.local
*.key
*.pem
```

### .dockerignore

Archivos excluidos de la imagen Docker:
```dockerignore
.env
.env.local
node_modules
.git
```

### Logging Seguro

El logger **NO registra** datos sensibles:

```typescript
// ❌ NO hacer
logger.info('User login', { password: user.password });

// ✅ Hacer
logger.info('User login', { user_id: user.id });
```

**Configuración:**
- Passwords nunca se loggean
- Tokens se enmascaran
- PII (información personal) se sanitiza

---

## Validación de Entrada

### Validaciones Técnicas

**Archivo:** `backend/src/services/ValidationService.ts`

Todas las entradas del CSV se validan:
- ✅ Campos requeridos no vacíos
- ✅ Fechas en formato válido
- ✅ Números positivos
- ✅ Estados y tipos en whitelist

**Protección contra:**
- SQL Injection (usa prepared statements)
- XSS (validación estricta de inputs)
- Data corruption (tipos y formatos)

### Validaciones de Negocio

**Archivo:** `backend/src/rules/RuleEngine.ts`

Motor de reglas OOP valida:
- ✅ Valores mínimos asegurados por tipo de póliza
- ✅ Reglas de negocio específicas

**Arquitectura Segura:**
- Open/Closed Principle - agregar reglas sin modificar motor
- Validaciones centralizadas y auditables
- Errores estructurados con códigos únicos

### Carga de Archivos

**Multer Configuration:**
```typescript
const upload = multer({
  storage: multer.memoryStorage(),  // No guardar en disco
  limits: {
    fileSize: 10 * 1024 * 1024      // Límite 10MB
  },
  fileFilter: (req, file, cb) => {
    // Solo CSV
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});
```

✅ **Seguridad:**
- Solo archivos CSV aceptados
- Límite de tamaño estricto
- Almacenamiento en memoria (no persiste archivos maliciosos)

---

## Headers de Seguridad

### Frontend (Nginx)

**Archivo:** `frontend/nginx.conf`

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

✅ **Protección contra:**
- **Clickjacking** - X-Frame-Options
- **MIME sniffing** - X-Content-Type-Options
- **XSS** - X-XSS-Protection
- **Información leakage** - Referrer-Policy

### CORS

**Backend:** `backend/src/index.ts`

```typescript
app.use(cors());  // Desarrollo
```

**Producción (Recomendado):**
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

---

## Mejores Prácticas

### ✅ Implementadas

1. **Validación ENV automática** - Sistema no inicia sin configuración válida
2. **Secrets fuera del código** - Variables de entorno + Azure Key Vault
3. **Contenedores no-root** - Principio de menor privilegio
4. **Health checks** - Monitoreo continuo y auto-recuperación
5. **Multi-stage builds** - Imágenes pequeñas y seguras
6. **Validación de entrada** - Todas las entradas sanitizadas
7. **Headers de seguridad** - Protección XSS, clickjacking, etc.
8. **Logging estructurado** - Trazabilidad con correlation IDs

### 🔜 Recomendaciones Futuras

1. **Rate Limiting**
   ```typescript
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,  // 15 minutos
     max: 100  // 100 requests por ventana
   });

   app.use('/upload', limiter);
   ```

2. **Autenticación y Autorización**
   - JWT tokens
   - OAuth 2.0 / Azure AD
   - RBAC (Role-Based Access Control)

3. **Encriptación en Tránsito**
   - HTTPS obligatorio en producción
   - TLS 1.3
   - Certificate pinning

4. **Audit Logging**
   - Registrar todas las operaciones sensibles
   - Inmutabilidad de logs
   - Retención por compliance

5. **Dependency Scanning**
   ```bash
   npm audit
   docker scan tekne-backend:latest
   ```

6. **Penetration Testing**
   - OWASP Top 10
   - Automated security scans
   - Manual pentesting

---

## Conclusión

El sistema implementa **múltiples capas de seguridad** que protegen contra las vulnerabilidades más comunes:

- 🛡️ Validación estricta de entradas
- 🔐 Secrets management adecuado
- 🐳 Contenedores seguros y monitoreados
- 📊 Observabilidad completa
- ⚡ Auto-recuperación ante fallos

Para reportar vulnerabilidades de seguridad, contactar al equipo de desarrollo.

