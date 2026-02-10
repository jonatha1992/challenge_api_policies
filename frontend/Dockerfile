# ==========================================
# STAGE 1: Build
# ==========================================
FROM node:18-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build arguments para la configuración en tiempo de compilación (Vite)
ARG VITE_API_URL=http://localhost:3000
ARG VITE_API_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_KEY=$VITE_API_KEY

# Compilar aplicación para producción
RUN npm run build

# ==========================================
# STAGE 2: Production with Nginx
# ==========================================
FROM nginx:alpine

# Metadata
LABEL maintainer="Challenge Tekne"
LABEL description="Frontend React App for Policy Management System"

# Copiar archivos compilados desde el stage de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Puerto por defecto (Railway inyectará el suyo)
ENV PORT=80

# Copiar configuración personalizada de nginx como template para envsubst
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Puerto informativo
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/ || exit 1

# Nginx se ejecuta en foreground por defecto
CMD ["nginx", "-g", "daemon off;"]

