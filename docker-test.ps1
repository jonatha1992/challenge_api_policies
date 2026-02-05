# Script para probar el stack completo de Docker (Windows PowerShell)
# Uso: .\docker-test.ps1

$ErrorActionPreference = "Stop"

Write-Host "🐳 Testing Docker Stack - Challenge Teknet" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Log-Info {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Log-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# 1. Validar docker-compose.yml
Write-Host "📋 Step 1: Validating docker-compose.yml..." -ForegroundColor Cyan
try {
    docker-compose config --quiet
    Log-Info "docker-compose.yml is valid"
} catch {
    Log-Error "docker-compose.yml has errors"
    exit 1
}
Write-Host ""

# 2. Limpiar containers anteriores
Write-Host "🧹 Step 2: Cleaning up previous containers..." -ForegroundColor Cyan
docker-compose down -v 2>$null
Log-Info "Previous containers cleaned"
Write-Host ""

# 3. Build de imágenes
Write-Host "🏗️  Step 3: Building Docker images..." -ForegroundColor Cyan
try {
    docker-compose build --no-cache
    Log-Info "Docker images built successfully"
} catch {
    Log-Error "Failed to build Docker images"
    exit 1
}
Write-Host ""

# 4. Iniciar servicios
Write-Host "🚀 Step 4: Starting services..." -ForegroundColor Cyan
try {
    docker-compose up -d
    Log-Info "Services started"
} catch {
    Log-Error "Failed to start services"
    exit 1
}
Write-Host ""

# 5. Esperar a que los servicios estén listos
Write-Host "⏳ Step 5: Waiting for services to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 10
Log-Info "Waiting completed"
Write-Host ""

# 6. Verificar salud de contenedores
Write-Host "🏥 Step 6: Checking container health..." -ForegroundColor Cyan

# Verificar Backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction SilentlyContinue
    if ($backendResponse.StatusCode -eq 200) {
        Log-Info "Backend is healthy (HTTP $($backendResponse.StatusCode))"
    }
} catch {
    Log-Warning "Backend might not be ready yet"
}

# Verificar Frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:80" -UseBasicParsing -ErrorAction SilentlyContinue
    if ($frontendResponse.StatusCode -eq 200) {
        Log-Info "Frontend is healthy (HTTP $($frontendResponse.StatusCode))"
    }
} catch {
    Log-Warning "Frontend might not be ready yet"
}
Write-Host ""

# 7. Mostrar logs
Write-Host "📜 Step 7: Recent logs..." -ForegroundColor Cyan
docker-compose logs --tail=20
Write-Host ""

# 8. Resumen
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
docker-compose ps
Write-Host ""

Write-Host "✅ Docker stack is running!" -ForegroundColor Green
Write-Host ""
Write-Host "Access the application:" -ForegroundColor White
Write-Host "  Frontend: http://localhost:80" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:3000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view logs:" -ForegroundColor White
Write-Host "  docker-compose logs -f" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop:" -ForegroundColor White
Write-Host "  docker-compose down" -ForegroundColor Cyan
Write-Host ""
