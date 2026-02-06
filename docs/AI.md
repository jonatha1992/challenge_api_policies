# Integración con Inteligencia Artificial

Documentación completa de la feature de IA implementada en el sistema de gestión de pólizas.

## Resumen

El sistema incluye una **feature de análisis con IA** que genera insights sobre el portfolio de pólizas. Utiliza una **arquitectura híbrida** con Google Gemini como motor principal y un analizador local como fallback.

## Recent Updates (Febrero 2026)

### ✅ Features Implementadas

1. **Recomendaciones Contextualizadas por Filtro**
   - Las recomendaciones ahora son específicas según el filtro aplicado (status, policy_type, búsqueda)
   - 8 contextos diferentes con recomendaciones únicas
   - Ejemplos:
     - **Active**: "Mantener seguimiento proactivo de renovaciones próximas (90 días antes)"
     - **Property**: "Revisar valoraciones de inmuebles anualmente"
     - **Auto**: "Implementar descuentos por buen historial de manejo"

2. **Modal se Cierra Automáticamente al Cambiar Filtros**
   - Cuando el usuario cambia cualquier filtro, el modal de insights se cierra automáticamente
   - Evita mostrar datos obsoletos o no relevantes al nuevo filtro

3. **Highlights Reflejan Pólizas Filtradas**
   - Los highlights (Total Policies, Risk Flags, Recommendations) ahora muestran **solo las estadísticas de las pólizas filtradas**
   - Antes mostraba siempre el total completo (incorrecto ❌)
   - Ahora calcula estadísticas dinámicamente según filtros aplicados (correcto ✅)
   - Implementado mediante `getSummaryWithFilters(filters)` en PolicyService

4. **Análisis Local Mejorado con Contexto**
   - El fallback local también considera los filtros aplicados
   - Genera recomendaciones más relevantes basadas en el contexto

5. **Prompts de IA Contextualizados**
   - Los prompts enviados a Gemini incluyen el contexto de filtros
   - Método `buildFilterContext()` convierte filtros técnicos a lenguaje natural
   - Ejemplo: `{ status: 'active', policy_type: 'Auto' }` → "pólizas activas y seguros de auto"

### 📊 Risk Flags Explicados

Los **Risk Flags** son indicadores de riesgo detectados automáticamente:

| Risk Flag | Descripción | Umbral |
|-----------|-------------|--------|
| **Alta Concentración** | Un tipo de póliza concentra > 60% del premium | > 60% |
| **Valores Mínimos Property** | Pólizas Property con valor < $5,500 | < $5,500 |
| **Valores Mínimos Auto** | Pólizas Auto con valor < $11,000 | < $11,000 |
| **Pólizas Expiradas** | Más del 20% de pólizas expiradas | > 20% |
| **Pólizas Canceladas** | Más del 10% de pólizas canceladas | > 10% |

**Interpretación:**
- **0 Risk Flags** = ✅ Portfolio saludable
- **1-2 Risk Flags** = ⚠️ Requiere atención
- **3+ Risk Flags** = 🚨 Acción urgente necesaria

### 🧪 Testing

```bash
# Test sin filtros
curl -X POST http://localhost:3000/ai/insights \
  -H "Content-Type: application/json" \
  -d '{"filters":{}}'

# Test con filtro status
curl -X POST http://localhost:3000/ai/insights \
  -H "Content-Type: application/json" \
  -d '{"filters":{"status":"active"}}'

# Test con múltiples filtros
curl -X POST http://localhost:3000/ai/insights \
  -H "Content-Type: application/json" \
  -d '{"filters":{"status":"active","policy_type":"Auto"}}'
```

**Verificación de Resultados:**
1. **Total Policies** debe reflejar solo las pólizas filtradas
2. **Insights** deben mencionar el contexto del filtro
3. **Recomendaciones** deben ser específicas al filtro aplicado

---

## Arquitectura

```
POST /ai/insights
    ▼
AIController
    ▼
AIInsightsService
    ├─ Google Gemini (si GEMINI_API_KEY existe)
    │   ├─ Modelo: gemini-2.0-flash-exp
    │   ├─ Análisis avanzado en la nube
    │   ├─ Context-aware prompts
    │   └─ Recomendaciones específicas por filtro
    └─ Local Analyzer (fallback)
        ├─ Estadísticas filtradas en memoria
        ├─ Reglas heurísticas contextualizadas
        └─ Sin dependencias externas
```

## Endpoint: POST /ai/insights

### Request

```json
{
  "filters": {
    "status": "active",
    "policy_type": "Property",
    "q": ""
  }
}
```

**Filtros opcionales:**
- `status` - Filtrar por estado (active, expired, cancelled)
- `policy_type` - Filtrar por tipo (Property, Auto, Life, Health)
- `q` - Búsqueda por policy_number o customer

### Response

```json
{
  "insights": [
    "Alta concentración de pólizas Property con valores cercanos al mínimo ($5,000 USD)",
    "El 60% de las pólizas están activas, indicando buena retención",
    "Recomendación: Revisar umbrales mínimos para pólizas Property",
    "Se detectaron 3 pólizas con fechas de renovación próximas"
  ],
  "highlights": {
    "total_policies": 120,
    "risk_flags": 3,
    "recommendations_count": 2
  }
}
```

## Implementación

### AIInsightsService

**Archivo:** `backend/src/services/AIInsightsService.ts`

**Inicialización:**
```typescript
class AIInsightsService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    // Inicializar Gemini solo si hay API key
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }
}
```

**Lógica de fallback:**
```typescript
async generateInsights(
  policies: Policy[],
  summary: PolicySummary,
  filters: PolicyFilters
): Promise<InsightsResponse> {
  // 1. Intentar usar Gemini con contexto de filtros
  if (this.genAI) {
    try {
      return await this.generateAIInsights(policies, summary, filters);
    } catch (error) {
      logger.warn('Gemini API failed, using local analyzer', { error });
    }
  }

  // 2. Fallback a análisis local contextualizado
  return this.generateLocalInsights(policies, summary, filters);
}
```

## Google Gemini Integration

### Configuración

**Variable de entorno:**
```env
GEMINI_API_KEY=AIzaSy...
```

**Modelo usado:** `gemini-2.0-flash-exp`
- ✅ Más rápido (~0.5-1 segundo)
- ✅ Gratis durante preview experimental
- ✅ Context window: 1M tokens
- ✅ Mejor comprensión contextual

### Prompt Engineering

**Estructura del prompt:**
```typescript
const prompt = `
Eres un analista de seguros experto. Analiza el siguiente portfolio de pólizas.

DATOS DEL PORTFOLIO:
- Total de pólizas: ${summary.total_policies}
- Premium total: $${summary.total_premium_usd} USD
- Distribución por estado:
  * Activas: ${summary.count_by_status.active}
  * Expiradas: ${summary.count_by_status.expired}
  * Canceladas: ${summary.count_by_status.cancelled}
- Premium por tipo:
  * Property: $${summary.premium_by_type.Property}
  * Auto: $${summary.premium_by_type.Auto}
  * Life: $${summary.premium_by_type.Life}
  * Health: $${summary.premium_by_type.Health}

CONTEXTO DE NEGOCIO:
- Valor mínimo asegurado Property: $5,000 USD
- Valor mínimo asegurado Auto: $10,000 USD

TAREA:
Genera un análisis de 5-10 líneas que incluya:
1. Riesgos o anomalías detectadas
2. 2-3 recomendaciones accionables
3. Métricas clave que requieren atención

Formato: Lista de insights concisos y accionables.
`;
```

**Parámetros de generación:**
```typescript
const generationConfig = {
  temperature: 0.7,      // Balance entre creatividad y consistencia
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 500,  // Respuestas concisas
};
```

### Manejo de Errores

```typescript
try {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 800,
      temperature: 0.5,
      responseMimeType: 'application/json'  // Forzar respuesta JSON
    }
  });

  const content = result.response.text();
  const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleanContent);

  return {
    insights: parsed.insights || [],
    highlights: {
      total_policies: summary.total_policies,
      risk_flags: parsed.risk_flags || 0,
      recommendations_count: parsed.insights.filter(i =>
        i.toLowerCase().includes('recomend')
      ).length
    }
  };
} catch (error) {
  logger.error('Gemini API error', { error });
  // Fallback automático con filtros
  return this.generateLocalInsights(policies, summary, filters);
}
```

**Errores comunes:**
- `PERMISSION_DENIED` → API key inválida
- `QUOTA_EXCEEDED` → Límite de requests alcanzado
- `INVALID_ARGUMENT` → Prompt malformado

## Local Analyzer (Fallback)

### Implementación

**Reglas heurísticas:**
```typescript
generateLocalInsights(policies, summary): InsightsResponse {
  const insights: string[] = [];
  let riskFlags = 0;

  // 1. Análisis de distribución
  if (summary.count_by_status.active < summary.total_policies * 0.5) {
    insights.push('Tasa de pólizas activas baja (< 50%)');
    riskFlags++;
  }

  // 2. Detección de valores cercanos al mínimo
  const propertyPolicies = policies.items.filter(p => p.policy_type === 'Property');
  const lowValueProperty = propertyPolicies.filter(p => p.insured_value_usd < 6000);

  if (lowValueProperty.length > propertyPolicies.length * 0.3) {
    insights.push('30% de pólizas Property cerca del valor mínimo');
    riskFlags++;
  }

  // 3. Concentración por tipo
  const maxType = Object.entries(summary.premium_by_type)
    .reduce((max, [type, premium]) => premium > max.premium ? { type, premium } : max,
            { type: '', premium: 0 });

  if (maxType.premium > summary.total_premium_usd * 0.5) {
    insights.push(`Alta concentración en ${maxType.type} (> 50% del premium)`);
  }

  // 4. Recomendaciones
  insights.push('Recomendación: Diversificar portfolio por tipo de póliza');
  insights.push('Recomendación: Revisar estrategia de retención');

  return {
    insights,
    highlights: {
      total_policies: summary.total_policies,
      risk_flags: riskFlags,
      recommendations_count: 2
    }
  };
}
```

**Ventajas del fallback:**
- ✅ Sin dependencias externas
- ✅ Gratis (sin costos de API)
- ✅ Funciona offline
- ⚠️ Menos sofisticado que Gemini

## Uso en Frontend

### Integración

**Service:** `frontend/src/services/api.ts`
```typescript
export const getInsights = async (filters: PolicyFilters): Promise<InsightsResponse> => {
  const response = await api.post<InsightsResponse>('/ai/insights', { filters });
  return response.data;
};
```

**UI:** `frontend/src/pages/Summary.tsx`
```tsx
<button onClick={handleGenerateInsights}>
  Generate Insights
</button>

{insights && (
  <div className="insights-section">
    <h3>AI Insights</h3>
    <ul>
      {insights.insights.map((insight, i) => (
        <li key={i}>{insight}</li>
      ))}
    </ul>
    <div className="highlights">
      <span>Risk Flags: {insights.highlights.risk_flags}</span>
      <span>Recommendations: {insights.highlights.recommendations_count}</span>
    </div>
  </div>
)}
```

## Costos y Límites

### Google Gemini Pricing (2025)

**gemini-1.5-flash:**
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens

**Estimación por request:**
- Prompt típico: ~500 tokens input
- Respuesta típica: ~200 tokens output
- **Costo por request:** ~$0.0001 USD (0.01 centavos)

**Ejemplo mensual:**
- 10,000 requests/mes
- Costo total: ~$1 USD/mes

### Rate Limits

**Gemini 1.5 Flash:**
- 15 RPM (requests per minute)
- 1M TPM (tokens per minute)
- 1,500 RPD (requests per day)

**Recomendación:**
- Implementar cache de 5 minutos para mismo filtro
- Rate limiting en backend (no implementado aún)

## Best Practices

### ✅ Implementadas

1. **Fallback automático** - Sistema funciona sin API key
2. **Logging de errores** - Tracking de fallos de Gemini
3. **Prompts estructurados** - Context-aware
4. **Parámetros conservadores** - Temperature 0.7 para consistencia

### 🔜 Recomendaciones

1. **Caching**
   ```typescript
   const cacheKey = `insights:${JSON.stringify(filters)}`;
   const cached = await redis.get(cacheKey);

   if (cached) return JSON.parse(cached);

   const insights = await this.generateInsights(filters);
   await redis.setex(cacheKey, 300, JSON.stringify(insights));  // 5 min cache
   ```

2. **Rate Limiting**
   ```typescript
   const limiter = rateLimit({
     windowMs: 60 * 1000,  // 1 minuto
     max: 10  // 10 requests por minuto
   });

   app.post('/ai/insights', limiter, aiController.generateInsights);
   ```

3. **Streaming de respuestas**
   ```typescript
   const stream = await model.generateContentStream(prompt);

   for await (const chunk of stream) {
     res.write(chunk.text());
   }
   ```

4. **Fine-tuning**
   - Entrenar modelo específico para análisis de seguros
   - Mejor precisión en detección de anomalías

## Conclusión

La integración de IA proporciona:
- 🤖 **Análisis inteligente** del portfolio
- ⚡ **Respuestas rápidas** (1-2 segundos)
- 💰 **Económico** (~$1/mes para 10k requests)
- 🛡️ **Fallback robusto** sin dependencias

El sistema está listo para producción con capacidad de escalar el uso de IA según necesidades del negocio.

