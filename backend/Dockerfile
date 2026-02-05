# ==========================================
# STAGE 1: Build
# ==========================================
FROM node:18-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build

# ==========================================
# STAGE 2: Production
# ==========================================
FROM node:18-alpine

# Metadata
LABEL maintainer="Challenge Tekne"
LABEL description="Backend API for Policy Management System"

# Instalar dumb-init para manejo correcto de señales
RUN apk add --no-cache dumb-init

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código compilado desde el stage de build
COPY --from=builder /app/dist ./dist

# Copiar migraciones SQL (necesarias para inicialización)
COPY database ./database

# Cambiar ownership de los archivos al usuario nodejs
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto de la aplicación
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Usar dumb-init para manejo correcto de señales (SIGTERM, SIGINT)
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["node", "dist/index.js"]

