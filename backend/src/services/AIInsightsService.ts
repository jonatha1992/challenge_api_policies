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
    return this.generateLocalInsights(policies, summary, filters);
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
      // Obtener el modelo de Gemini configurado (usando versión 2.0 más reciente)
      // Construir instrucción del sistema considerando los filtros aplicados
      const filterContext = this.buildFilterContext(filters);

      const model = this.genAI!.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        systemInstruction: `Eres un analista de portafolios de seguros. Analiza los datos y proporciona:
1. Análisis de riesgos y anomalías ESPECÍFICOS para ${filterContext}
2. 2-3 recomendaciones accionables ENFOCADAS en ${filterContext}
Mantén las respuestas concisas (5-10 líneas total). Responde en español.
Retorna SOLO formato JSON válido: {"insights": ["insight1", "insight2", "insight3"], "risk_flags": number}
No incluyas texto adicional, markdown, ni explicaciones fuera del JSON.`
      });

      console.log('[AIInsights] Llamando a Gemini API con', policies.length, 'pólizas...');

      // Generar contenido con la IA
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 800,  // Aumentar límite para respuestas más completas
          temperature: 0.5,      // Reducir temperatura para más consistencia
          responseMimeType: 'application/json'  // Forzar respuesta en JSON
        }
      });

      console.log('[AIInsights] Respuesta recibida de Gemini');

      // Extraer el contenido de la respuesta
      const content = result.response.text() || '{}';
      console.log('[AIInsights] Contenido recibido:', content.substring(0, 200));

      try {
        // Limpiar posibles backticks de markdown y parsear JSON
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanContent);

        console.log('[AIInsights] JSON parseado exitosamente:', {
          insightsCount: parsed.insights?.length || 0,
          riskFlags: parsed.risk_flags
        });

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
      } catch (parseError) {
        // Si no se puede parsear JSON, retornar el contenido como un insight simple
        console.error('[AIInsights] Error parseando JSON de Gemini:', parseError);
        console.error('[AIInsights] Contenido que falló:', content);
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
      console.error('[AIInsights] Gemini API error, falling back to local analysis:');
      console.error(error);
      return this.generateLocalInsights(policies, summary, filters);
    }
  }

  /**
   * Genera insights usando análisis local basado en reglas predefinidas.
   * No requiere conexión a servicios externos, funciona completamente offline.
   * Analiza el portfolio basado en reglas de negocio conocidas.
   *
   * @param policies - Pólizas a analizar
   * @param summary - Estadísticas del portfolio
   * @param filters - Filtros aplicados para contextualizar las recomendaciones
   * @returns Insights generados por reglas locales
   */
  private generateLocalInsights(
    policies: Policy[],
    summary: PolicySummary,
    filters: PolicyFilters
  ): InsightsResponse {
    const insights: string[] = [];  // Array para almacenar los insights generados
    let riskFlags = 0;              // Contador de indicadores de riesgo

    // Construir contexto de filtros para recomendaciones específicas
    const filterContext = this.buildFilterContext(filters);

    // 1. Análisis de concentración por tipo de póliza
    riskFlags += this.analyzeTypeConcentration(summary, insights, filters);

    // 2. Análisis de valores asegurados cercanos al mínimo
    riskFlags += this.analyzeMinimumValues(policies, insights, filters);

    // 3. Análisis de distribución por estado
    riskFlags += this.analyzeStatusDistribution(summary, insights, filters);

    // 4. Si no hay insights críticos, agregar resumen contextualizado
    if (insights.length === 0) {
      insights.push(
        `Análisis de ${filterContext}: ` +
        `${summary.total_policies} póliza(s) con ` +
        `$${summary.total_premium_usd.toLocaleString()} en premiums totales. ` +
        `No se detectaron anomalías significativas.`
      );
    }

    // 5. Agregar recomendación específica según filtros
    if (summary.total_policies > 0 && insights.length < 3) {
      insights.push(this.buildContextualRecommendation(filters, summary));
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
   * @param filters - Filtros aplicados para contextualizar el análisis
   * @returns Número de risk flags detectados (0 o 1)
   */
  private analyzeTypeConcentration(
    summary: PolicySummary,
    insights: string[],
    filters: PolicyFilters
  ): number {
    let riskFlags = 0;
    // Obtener distribución ordenada por premium descendente
    const typeDistribution = Object.entries(summary.premium_by_type)
      .filter(([_, premium]) => premium > 0)
      .sort((a, b) => b[1] - a[1]);

    if (typeDistribution.length > 0 && summary.total_premium_usd > 0) {
      const topType = typeDistribution[0];
      const concentration = (topType[1] / summary.total_premium_usd) * 100;

      // Si la concentración supera el 60%, es un riesgo
      if (concentration > 60) {
        const recommendation = filters.policy_type
          ? `En el segmento de ${filters.policy_type}, se observa alta concentración (${concentration.toFixed(1)}%). ` +
            `Recomendación: evaluar estrategias de diversificación dentro de este tipo de póliza.`
          : `Alta concentración en pólizas ${topType[0]}: ${concentration.toFixed(1)}% del premium total. ` +
            `Considere diversificar el portafolio para reducir riesgo.`;

        insights.push(recommendation);
        riskFlags++;
      }
    }
    return riskFlags;
  }

  /**
   * Analiza pólizas con valores asegurados cercanos al mínimo requerido.
   * Identifica casos que podrían necesitar revisión.
   * @param filters - Filtros aplicados para contextualizar el análisis
   * @returns Número de risk flags detectados (0, 1 o 2)
   */
  private analyzeMinimumValues(
    policies: Policy[],
    insights: string[],
    filters: PolicyFilters
  ): number {
    let riskFlags = 0;
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
      const recommendation = filters.policy_type === 'Property'
        ? `Detectadas ${propertyNearMin} póliza(s) de Property con valores cercanos al mínimo requerido. ` +
          `Recomendación específica: revisar coberturas y ajustar valores asegurados según el perfil de riesgo del cliente.`
        : `${propertyNearMin} póliza(s) Property con valor asegurado cercano al mínimo ($${MIN_VALUES.Property.toLocaleString()}). ` +
          `Recomendación: implementar alertas cuando insured_value < 1.1x del mínimo.`;

      insights.push(recommendation);
      riskFlags++;
    }

    // Contar pólizas Auto cerca del mínimo
    const autoNearMin = policies.filter(p =>
      p.policy_type === 'Auto' && p.insured_value_usd < 11000  // 10% por encima del mínimo
    ).length;

    if (autoNearMin > 0) {
      const recommendation = filters.policy_type === 'Auto'
        ? `Detectadas ${autoNearMin} póliza(s) de Auto con valores mínimos. ` +
          `Recomendación específica: evaluar si la cobertura actual es suficiente según el valor de mercado del vehículo.`
        : `${autoNearMin} póliza(s) Auto con valor asegurado cercano al mínimo ($${MIN_VALUES.Auto.toLocaleString()}). ` +
          `Considere revisar estos casos para posibles ajustes de cobertura.`;

      insights.push(recommendation);
      riskFlags++;
    }
    return riskFlags;
  }

  /**
   * Analiza la distribución de pólizas por estado.
   * Identifica ratios altos de pólizas expiradas o canceladas.
   * @param filters - Filtros aplicados para contextualizar el análisis
   * @returns Número de risk flags detectados (0, 1 o 2)
   */
  private analyzeStatusDistribution(
    summary: PolicySummary,
    insights: string[],
    filters: PolicyFilters
  ): number {
    let riskFlags = 0;
    if (summary.total_policies > 0) {
      // Análisis de pólizas expiradas
      const expiredCount = summary.count_by_status['expired'] || 0;
      const expiredRatio = expiredCount / summary.total_policies;

      if (expiredRatio > 0.2) {  // Más del 20% expiradas
        const recommendation = filters.status === 'expired'
          ? `Análisis de pólizas expiradas: ${expiredCount} póliza(s) requieren atención inmediata. ` +
            `Recomendación específica: priorizar contacto con clientes para renovación y evaluar incentivos de retención.`
          : `${(expiredRatio * 100).toFixed(1)}% de pólizas están expiradas (${expiredCount} de ${summary.total_policies}). ` +
            `Recomendación: implementar proceso de renovación automática o alertas de vencimiento.`;

        insights.push(recommendation);
        riskFlags++;
      }

      // Análisis de pólizas canceladas
      const cancelledCount = summary.count_by_status['cancelled'] || 0;
      const cancelledRatio = cancelledCount / summary.total_policies;

      if (cancelledRatio > 0.1) {  // Más del 10% canceladas
        const recommendation = filters.status === 'cancelled'
          ? `Análisis de pólizas canceladas: ${cancelledCount} caso(s) identificado(s). ` +
            `Recomendación específica: realizar encuesta de satisfacción y análisis de competencia para reducir churn.`
          : `Tasa de cancelación elevada: ${(cancelledRatio * 100).toFixed(1)}%. ` +
            `Recomendación: analizar causas de cancelación para mejorar retención.`;

        insights.push(recommendation);
        riskFlags++;
      }
    }
    return riskFlags;
  }

  /**
   * Construye una recomendación contextualizada según los filtros aplicados.
   * Genera recomendaciones específicas para el segmento de pólizas analizado.
   *
   * @param filters - Filtros aplicados
   * @param summary - Estadísticas del portfolio
   * @returns Recomendación específica para el contexto
   */
  private buildContextualRecommendation(
    filters: PolicyFilters,
    summary: PolicySummary
  ): string {
    // Recomendación específica por estado
    if (filters.status === 'active') {
      return `Pólizas activas: Mantener seguimiento proactivo de renovaciones próximas (90 días antes) ` +
        `y evaluar oportunidades de cross-selling de productos complementarios.`;
    }

    if (filters.status === 'expired') {
      return `Pólizas expiradas: Implementar campaña de recuperación con incentivos personalizados ` +
        `y contacto directo para entender razones de no renovación.`;
    }

    if (filters.status === 'cancelled') {
      return `Pólizas canceladas: Realizar análisis de causas raíz (precio, servicio, competencia) ` +
        `y desarrollar estrategia de prevención de churn para casos similares.`;
    }

    // Recomendación específica por tipo de póliza
    if (filters.policy_type === 'Property') {
      return `Seguros de Propiedad: Revisar valoraciones de inmuebles anualmente y ofrecer ` +
        `coberturas adicionales (desastres naturales, robo, daños).`;
    }

    if (filters.policy_type === 'Auto') {
      return `Seguros de Auto: Implementar descuentos por buen historial de manejo y ` +
        `considerar telemetría para ajustar primas según comportamiento real.`;
    }

    if (filters.policy_type === 'Life') {
      return `Seguros de Vida: Evaluar cambios en circunstancias personales de clientes ` +
        `(matrimonio, hijos, hipoteca) para ajustar coberturas y beneficiarios.`;
    }

    if (filters.policy_type === 'Health') {
      return `Seguros de Salud: Promover programas de prevención y wellness para reducir ` +
        `siniestralidad y mejorar satisfacción del cliente.`;
    }

    // Recomendación general si hay búsqueda por texto
    if (filters.q) {
      return `Búsqueda personalizada: Revisar los resultados específicos encontrados y ` +
        `considerar patrones comunes para acciones preventivas o correctivas.`;
    }

    // Recomendación general por defecto
    return `Recomendación general: Mantener monitoreo continuo del ratio loss/premium ` +
      `y revisar periódicamente la distribución de riesgo por tipo de póliza.`;
  }

  /**
   * Construye el contexto de filtros para las instrucciones de la IA.
   * Genera una descripción en lenguaje natural de los filtros aplicados.
   *
   * @param filters - Filtros aplicados por el usuario
   * @returns Descripción del contexto de filtros
   */
  private buildFilterContext(filters: PolicyFilters): string {
    const contexts: string[] = [];

    if (filters.status) {
      const statusLabels: Record<string, string> = {
        active: 'pólizas activas',
        expired: 'pólizas expiradas',
        cancelled: 'pólizas canceladas'
      };
      contexts.push(statusLabels[filters.status] || filters.status);
    }

    if (filters.policy_type) {
      const typeLabels: Record<string, string> = {
        Property: 'seguros de propiedad',
        Auto: 'seguros de auto',
        Life: 'seguros de vida',
        Health: 'seguros de salud'
      };
      contexts.push(typeLabels[filters.policy_type] || filters.policy_type);
    }

    if (filters.q) {
      contexts.push(`búsqueda: "${filters.q}"`);
    }

    // Si no hay filtros, analizar todo el portfolio
    if (contexts.length === 0) {
      return 'todo el portfolio';
    }

    // Si hay múltiples filtros, combinarlos con "y"
    return contexts.join(' y ');
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
    const filterContext = this.buildFilterContext(filters);

    return `
Analiza este portafolio de seguros ENFOCÁNDOTE ESPECÍFICAMENTE en ${filterContext}:

Resumen:
- Total pólizas analizadas: ${summary.total_policies}
- Premium total: $${summary.total_premium_usd.toLocaleString()}
- Por estado: ${JSON.stringify(summary.count_by_status)}
- Premium por tipo: ${JSON.stringify(summary.premium_by_type)}

Filtros aplicados: ${JSON.stringify(filters)}

Muestra de pólizas (primeras 10):
${JSON.stringify(policies.slice(0, 10), null, 2)}

Valores mínimos asegurados por regla de negocio:
- Property: $5,000
- Auto: $10,000

IMPORTANTE:
- Genera recomendaciones ESPECÍFICAS para ${filterContext}
- Si hay un filtro de tipo de póliza, enfócate en ese tipo específico
- Si hay un filtro de estado, analiza las implicaciones de ese estado
- Sé CONCRETO y ACCIONABLE en tus recomendaciones

Proporciona análisis de riesgos y recomendaciones en español.
    `;
  }
}

