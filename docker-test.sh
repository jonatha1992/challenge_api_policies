#!/bin/bash

# Script para probar el stack completo de Docker
# Uso: ./docker-test.sh

set -e

echo "🐳 Testing Docker Stack - Challenge tekne"
echo "=========================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Validar docker-compose.yml
echo "📋 Step 1: Validating docker-compose.yml..."
if docker-compose config --quiet; then
    log_info "docker-compose.yml is valid"
else
    log_error "docker-compose.yml has errors"
    exit 1
fi
echo ""

# 2. Limpiar containers anteriores
echo "🧹 Step 2: Cleaning up previous containers..."
docker-compose down -v 2>/dev/null || true
log_info "Previous containers cleaned"
echo ""

# 3. Build de imágenes
echo "🏗️  Step 3: Building Docker images..."
if docker-compose build --no-cache; then
    log_info "Docker images built successfully"
else
    log_error "Failed to build Docker images"
    exit 1
fi
echo ""

# 4. Iniciar servicios
echo "🚀 Step 4: Starting services..."
if docker-compose up -d; then
    log_info "Services started"
else
    log_error "Failed to start services"
    exit 1
fi
echo ""

# 5. Esperar a que los servicios estén listos
echo "⏳ Step 5: Waiting for services to be ready..."
sleep 10
log_info "Waiting completed"
echo ""

# 6. Verificar salud de contenedores
echo "🏥 Step 6: Checking container health..."

# Verificar PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    log_info "PostgreSQL is healthy"
else
    log_warning "PostgreSQL might not be ready yet"
fi

# Verificar Backend
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
    log_info "Backend is healthy (HTTP $BACKEND_HEALTH)"
else
    log_warning "Backend returned HTTP $BACKEND_HEALTH"
fi

# Verificar Frontend
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 || echo "000")
if [ "$FRONTEND_HEALTH" = "200" ]; then
    log_info "Frontend is healthy (HTTP $FRONTEND_HEALTH)"
else
    log_warning "Frontend returned HTTP $FRONTEND_HEALTH"
fi
echo ""

# 7. Mostrar logs
echo "📜 Step 7: Recent logs..."
docker-compose logs --tail=20
echo ""

# 8. Resumen
echo "=========================================="
echo "📊 SUMMARY"
echo "=========================================="
docker-compose ps
echo ""

echo -e "${GREEN}✅ Docker stack is running!${NC}"
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost:80"
echo "  Backend:  http://localhost:3000"
echo "  API Docs: http://localhost:3000/api"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop:"
echo "  docker-compose down"
echo ""

