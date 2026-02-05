import { Request, Response } from 'express';
import { PolicyService } from '../services/PolicyService';
import { AIInsightsService } from '../services/AIInsightsService';
import { PolicyFilters, PolicyStatus, PolicyType } from '../types/policy.types';

/**
 * Controlador para el endpoint de IA.
 * Este controlador expone un endpoint para generar insights automáticos
 * sobre el portfolio de pólizas, usando filtros opcionales.
 */
export class AIController {
  // Servicios utilizados para obtener datos y generar insights
  private policyService = new PolicyService();
  private aiService = new AIInsightsService();

  /**
   * Maneja la petición POST /ai/insights.
   * Recibe filtros opcionales en el body y retorna insights generados.
   *
   * Parámetros del body:
   * - filters: Filtros opcionales para analizar un subconjunto de pólizas
   *   - status: Filtrar por estado de la póliza (active, expired, cancelled)
   *   - policy_type: Filtrar por tipo de póliza (Property, Auto, Life, Health)
   *   - q: Búsqueda por texto en número de póliza o nombre del cliente
   *
   * Retorna un objeto con:
   * - insights: Array de observaciones y recomendaciones generadas
   * - highlights: Métricas clave (total de pólizas, indicadores de riesgo, recomendaciones)
   *
   * @param req - Objeto Request de Express con los filtros en el body
   * @param res - Objeto Response de Express para enviar la respuesta
   */
  async generateInsights(req: Request, res: Response): Promise<void> {
    try {
      // 1. Extraer los filtros enviados en el body de la petición.
      // Si no se envían filtros, se usa un objeto vacío.
      const bodyFilters = req.body.filters || {};

      // 2. Construir el objeto de filtros tipado.
      // Esto asegura que los filtros tengan el tipo correcto y sean fáciles de entender.
      const filters: PolicyFilters = {
        status: bodyFilters.status as PolicyStatus | undefined,
        policy_type: bodyFilters.policy_type as PolicyType | undefined,
        q: bodyFilters.q as string | undefined,
        limit: 100 // Limitar el análisis a 100 pólizas para evitar sobrecarga
      };

      // 3. Obtener la lista de pólizas y el resumen general.
      // Se hace de forma secuencial para mayor claridad y facilidad de depuración.
      const policiesResult = await this.policyService.findAll(filters);
      const summary = await this.policyService.getSummary();

      // 4. Generar los insights usando el servicio de IA.
      // Se pasan las pólizas filtradas, el resumen y los filtros aplicados.
      const insights = await this.aiService.generateInsights(
        policiesResult.items,
        summary,
        filters
      );

      // 5. Responder al cliente con los insights generados.
      res.json(insights);
    } catch (error: unknown) {
      // 6. Manejo de errores: devolver mensaje claro y status 500.
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  }
}
