import { GoogleGenerativeAI } from '@google/generative-ai';
import { Policy, PolicySummary, PolicyFilters } from '../types/policy.types';

/**
 * Interfaz que define la estructura de respuesta de insights.
 * Contiene los insights generados y métricas destacadas.
 */
interface InsightsResponse {
  insights: string[];  // Array de observaciones y recomendaciones
  highlights: {
    total_policies: number;     // Total de pólizas analizadas
    risk_flags: number;         // Número de indicadores de riesgo encontrados
    recommendations_count: number; // Número de recomendaciones generadas
  };
}

/**
 * Servicio para generar insights con IA sobre el portfolio de pólizas.
 *
 * Este servicio puede funcionar de dos formas:
 * 1. Si hay API key de Gemini configurada, usa Google Gemini para análisis avanzado con IA
 * 2. Si no hay API key, usa análisis local basado en reglas predefinidas
 *
 * El objetivo es proporcionar observaciones útiles sobre el estado del portfolio,
 * identificar riesgos potenciales y sugerir acciones correctivas.
 */
export class AIInsightsService {
  // Instancia del cliente de Google Generative AI (solo si hay API key)
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    // Inicializar el cliente de Gemini solo si hay API key configurada
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  /**
   * Genera insights sobre el portfolio de pólizas.
   * Decide automáticamente si usar análisis con IA (Gemini) o análisis local.
   *
   * @param policies - Lista de pólizas a analizar (filtradas según los criterios)
   * @param summary - Estadísticas agregadas del portfolio completo
   * @param filters - Filtros que se aplicaron para obtener las pólizas analizadas
   * @returns Objeto con insights generados y métricas destacadas
   */
  async generateInsights(
    policies: Policy[],
    summary: PolicySummary,
    filters: PolicyFilters
  ): Promise<InsightsResponse> {
    // Si hay API key de Gemini configurada, usar análisis con IA
    if (this.genAI) {
      return this.generateAIInsights(policies, summary, filters);
    }

    // Si no hay API key, usar análisis local basado en reglas
    return this.generateLocalInsights(policies, summary);
  }

  /**
   * Genera insights usando Google Gemini (IA avanzada).
   * Envía los datos a la API de Gemini con instrucciones específicas
   * para obtener un análisis inteligente del portfolio.
   *
   * @param policies - Pólizas a analizar
   * @param summary - Estadísticas del portfolio
   * @param filters - Filtros aplicados
   * @returns Insights generados por IA
   */
  private async generateAIInsights(
    policies: Policy[],
    summary: PolicySummary,
    filters: PolicyFilters
  ): Promise<InsightsResponse> {
    // Construir el prompt con toda la información necesaria
    const prompt = this.buildPrompt(policies, summary, filters);

    try {
      // Obtener el modelo de Gemini configurado
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Instrucciones específicas para el modelo de IA
      const systemInstruction = `Eres un analista de portafolios de seguros. Analiza los datos y proporciona:
1. Análisis de riesgos y anomalías
2. 2-3 recomendaciones accionables
Mantén las respuestas concisas (5-10 líneas total). Responde en español.
Retorna formato JSON: {"insights": ["insight1", "insight2"], "risk_flags": number}
Solo responde con el JSON, sin texto adicional.`;

      // Generar contenido con la IA
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemInstruction + '\n\n' + prompt }] }],
        generationConfig: {
          maxOutputTokens: 500,  // Limitar la longitud de la respuesta
          temperature: 0.7       // Balance entre creatividad y consistencia
        }
      });

      // Extraer el contenido de la respuesta
      const content = result.response.text() || '{}';

      try {
        // Limpiar posibles backticks de markdown y parsear JSON
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanContent);

        // Retornar respuesta estructurada
        return {
          insights: parsed.insights || [],
          highlights: {
            total_policies: summary.total_policies,
            risk_flags: parsed.risk_flags || 0,
            recommendations_count: (parsed.insights || []).filter((i: string) =>
              i.toLowerCase().includes('recomend') || i.toLowerCase().includes('suggest')
            ).length
          }
        };
      } catch {
        // Si no se puede parsear JSON, retornar el contenido como un insight simple
        return {
          insights: [content],
          highlights: {
            total_policies: summary.total_policies,
            risk_flags: 0,
            recommendations_count: 0
          }
        };
      }
    } catch (error) {
      // Si falla la API de Gemini, hacer fallback al análisis local
      console.error('Gemini API error, falling back to local analysis:', error);
      return this.generateLocalInsights(policies, summary);
    }
  }

  /**
   * Genera insights usando análisis local basado en reglas predefinidas.
   * No requiere conexión a servicios externos, funciona completamente offline.
   * Analiza el portfolio basado en reglas de negocio conocidas.
   *
   * @param policies - Pólizas a analizar
   * @param summary - Estadísticas del portfolio
   * @returns Insights generados por reglas locales
   */
  private generateLocalInsights(
    policies: Policy[],
    summary: PolicySummary
  ): InsightsResponse {
    const insights: string[] = [];  // Array para almacenar los insights generados
    let riskFlags = 0;              // Contador de indicadores de riesgo

    // 1. Análisis de concentración por tipo de póliza
    this.analyzeTypeConcentration(summary, insights, riskFlags);

    // 2. Análisis de valores asegurados cercanos al mínimo
    this.analyzeMinimumValues(policies, insights, riskFlags);

    // 3. Análisis de distribución por estado
    this.analyzeStatusDistribution(summary, insights, riskFlags);

    // 4. Si no hay insights críticos, agregar resumen positivo
    if (insights.length === 0) {
      insights.push(
        `Portfolio saludable con ${summary.total_policies} póliza(s) y ` +
        `$${summary.total_premium_usd.toLocaleString()} en premiums totales. ` +
        `No se detectaron anomalías significativas.`
      );
    }

    // 5. Agregar recomendación general si hay datos y espacio
    if (summary.total_policies > 0 && insights.length < 3) {
      insights.push(
        `Recomendación general: mantener monitoreo continuo del ratio loss/premium ` +
        `y revisar periódicamente la distribución de riesgo por tipo de póliza.`
      );
    }

    // Retornar respuesta estructurada
    return {
      insights,
      highlights: {
        total_policies: summary.total_policies,
        risk_flags: riskFlags,
        recommendations_count: insights.filter(i =>
          i.toLowerCase().includes('recomend') || i.toLowerCase().includes('considere')
        ).length
      }
    };
  }

  /**
   * Analiza la concentración de premium por tipo de póliza.
   * Identifica si hay un tipo que concentra demasiado riesgo.
   */
  private analyzeTypeConcentration(
    summary: PolicySummary,
    insights: string[],
    riskFlags: number
  ): void {
    // Obtener distribución ordenada por premium descendente
    const typeDistribution = Object.entries(summary.premium_by_type)
      .filter(([_, premium]) => premium > 0)
      .sort((a, b) => b[1] - a[1]);

    if (typeDistribution.length > 0 && summary.total_premium_usd > 0) {
      const topType = typeDistribution[0];
      const concentration = (topType[1] / summary.total_premium_usd) * 100;

      // Si la concentración supera el 60%, es un riesgo
      if (concentration > 60) {
        insights.push(
          `Alta concentración en pólizas ${topType[0]}: ${concentration.toFixed(1)}% del premium total. ` +
          `Considere diversificar el portafolio para reducir riesgo.`
        );
        riskFlags++;
      }
    }
  }

  /**
   * Analiza pólizas con valores asegurados cercanos al mínimo requerido.
   * Identifica casos que podrían necesitar revisión.
   */
  private analyzeMinimumValues(
    policies: Policy[],
    insights: string[],
    riskFlags: number
  ): void {
    // Valores mínimos por tipo según reglas de negocio
    const MIN_VALUES = {
      Property: 5000,
      Auto: 10000
    };

    // Contar pólizas Property cerca del mínimo
    const propertyNearMin = policies.filter(p =>
      p.policy_type === 'Property' && p.insured_value_usd < 5500  // 10% por encima del mínimo
    ).length;

    if (propertyNearMin > 0) {
      insights.push(
        `${propertyNearMin} póliza(s) Property con valor asegurado cercano al mínimo ($${MIN_VALUES.Property.toLocaleString()}). ` +
        `Recomendación: implementar alertas cuando insured_value < 1.1x del mínimo.`
      );
      riskFlags++;
    }

    // Contar pólizas Auto cerca del mínimo
    const autoNearMin = policies.filter(p =>
      p.policy_type === 'Auto' && p.insured_value_usd < 11000  // 10% por encima del mínimo
    ).length;

    if (autoNearMin > 0) {
      insights.push(
        `${autoNearMin} póliza(s) Auto con valor asegurado cercano al mínimo ($${MIN_VALUES.Auto.toLocaleString()}). ` +
        `Considere revisar estos casos para posibles ajustes de cobertura.`
      );
      riskFlags++;
    }
  }

  /**
   * Analiza la distribución de pólizas por estado.
   * Identifica ratios altos de pólizas expiradas o canceladas.
   */
  private analyzeStatusDistribution(
    summary: PolicySummary,
    insights: string[],
    riskFlags: number
  ): void {
    if (summary.total_policies > 0) {
      // Análisis de pólizas expiradas
      const expiredCount = summary.count_by_status['expired'] || 0;
      const expiredRatio = expiredCount / summary.total_policies;

      if (expiredRatio > 0.2) {  // Más del 20% expiradas
        insights.push(
          `${(expiredRatio * 100).toFixed(1)}% de pólizas están expiradas (${expiredCount} de ${summary.total_policies}). ` +
          `Recomendación: implementar proceso de renovación automática o alertas de vencimiento.`
        );
        riskFlags++;
      }

      // Análisis de pólizas canceladas
      const cancelledCount = summary.count_by_status['cancelled'] || 0;
      const cancelledRatio = cancelledCount / summary.total_policies;

      if (cancelledRatio > 0.1) {  // Más del 10% canceladas
        insights.push(
          `Tasa de cancelación elevada: ${(cancelledRatio * 100).toFixed(1)}%. ` +
          `Recomendación: analizar causas de cancelación para mejorar retención.`
        );
        riskFlags++;
      }
    }
  }

  /**
   * Construye el prompt detallado para enviar a Gemini.
   * Incluye toda la información necesaria para que la IA pueda hacer un análisis completo.
   *
   * @param policies - Pólizas a analizar
   * @param summary - Estadísticas del portfolio
   * @param filters - Filtros aplicados
   * @returns Prompt completo formateado para la IA
   */
  private buildPrompt(
    policies: Policy[],
    summary: PolicySummary,
    filters: PolicyFilters
  ): string {
    return `
Analiza este portafolio de seguros:

Resumen:
- Total pólizas: ${summary.total_policies}
- Premium total: $${summary.total_premium_usd.toLocaleString()}
- Por estado: ${JSON.stringify(summary.count_by_status)}
- Premium por tipo: ${JSON.stringify(summary.premium_by_type)}

Filtros aplicados: ${JSON.stringify(filters)}

Muestra de pólizas (primeras 10):
${JSON.stringify(policies.slice(0, 10), null, 2)}

Valores mínimos asegurados por regla de negocio:
- Property: $5,000
- Auto: $10,000

Proporciona análisis de riesgos y recomendaciones en español.
    `;
  }
}
