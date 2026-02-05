import { Request, Response } from 'express';
import { PolicyService } from '../services/PolicyService';
import { PolicyFilters, PolicyStatus, PolicyType } from '../types/policy.types';

/**
 * Controlador para los endpoints de consulta de pólizas.
 * Este controlador maneja todas las operaciones relacionadas con la consulta
 * y obtención de información sobre pólizas de seguros.
 */
export class PolicyController {
  // Servicio que maneja la lógica de negocio de pólizas
  private policyService = new PolicyService();

  /**
   * Maneja la petición GET /policies.
   * Lista pólizas con paginación y filtros opcionales.
   *
   * Parámetros de consulta (query params):
   * - limit: Máximo número de resultados a devolver (por defecto 25, máximo 100)
   * - offset: Desplazamiento para paginación (por defecto 0)
   * - status: Filtrar por estado de la póliza (active, expired, cancelled)
   * - policy_type: Filtrar por tipo de póliza (Property, Auto, Life, Health)
   * - q: Búsqueda por número de póliza o nombre del cliente
   *
   * @param req - Objeto Request de Express con los parámetros de consulta
   * @param res - Objeto Response de Express para enviar la respuesta
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      // 1. Construir el objeto de filtros a partir de los parámetros de consulta
      const filters: PolicyFilters = {
        status: req.query.status as PolicyStatus | undefined,
        policy_type: req.query.policy_type as PolicyType | undefined,
        q: req.query.q as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 25,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // 2. Obtener las pólizas filtradas del servicio
      const result = await this.policyService.findAll(filters);

      // 3. Enviar la respuesta al cliente
      res.json(result);
    } catch (error: unknown) {
      // 4. Manejo de errores: devolver mensaje claro y status 500
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Maneja la petición GET /policies/summary.
   * Obtiene estadísticas agregadas del portfolio de pólizas.
   *
   * Retorna un objeto con:
   * - total_policies: Cantidad total de pólizas en el sistema
   * - total_premium_usd: Suma total de los premiums en dólares
   * - count_by_status: Conteo de pólizas agrupadas por estado
   * - premium_by_type: Premium total agrupado por tipo de póliza
   *
   * @param req - Objeto Request de Express (no se usa en este endpoint)
   * @param res - Objeto Response de Express para enviar la respuesta
   */
  async summary(req: Request, res: Response): Promise<void> {
    try {
      // 1. Obtener el resumen estadístico del servicio de pólizas
      const summary = await this.policyService.getSummary();

      // 2. Enviar el resumen al cliente
      res.json(summary);
    } catch (error: unknown) {
      // 3. Manejo de errores: devolver mensaje claro y status 500
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  }
}
