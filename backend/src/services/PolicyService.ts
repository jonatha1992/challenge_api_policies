import { pool } from '../config/database';
import {
  Policy,
  PolicyFilters,
  PaginatedResponse,
  PolicySummary
} from '../types/policy.types';

/**
 * Servicio para operaciones CRUD de pólizas.
 * Este servicio maneja todas las operaciones relacionadas con pólizas de seguros:
 * inserción, consulta, búsqueda y estadísticas agregadas.
 */
export class PolicyService {
  /**
   * Inserta una póliza nueva o actualiza si ya existe (basado en policy_number).
   * Utiliza la cláusula ON CONFLICT de PostgreSQL para lograr idempotencia,
   * permitiendo reintentos seguros sin duplicar datos.
   *
   * Adicionalmente, detecta si la operación fue un INSERT nuevo o un UPDATE
   * de una póliza existente usando el campo interno xmax de PostgreSQL.
   *
   * @param policy - La póliza a insertar o actualizar
   * @returns Objeto con la póliza y un flag indicando si fue actualización
   */
  async insertPolicy(policy: Policy): Promise<{ policy: Policy; was_updated: boolean }> {
    // Ejecutar consulta de inserción con manejo de conflictos
    // xmax = 0 indica INSERT, xmax > 0 indica UPDATE (PostgreSQL 9.1+)
    const queryResult = await pool.query(
      `INSERT INTO policies
       (policy_number, customer, policy_type, start_date, end_date, premium_usd, status, insured_value_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (policy_number) DO UPDATE SET
         customer = EXCLUDED.customer,
         policy_type = EXCLUDED.policy_type,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         premium_usd = EXCLUDED.premium_usd,
         status = EXCLUDED.status,
         insured_value_usd = EXCLUDED.insured_value_usd
       RETURNING *, (xmax = 0) AS was_insert`,
      [
        policy.policy_number,
        policy.customer,
        policy.policy_type,
        policy.start_date,
        policy.end_date,
        policy.premium_usd,
        policy.status,
        policy.insured_value_usd
      ]
    );

    const row = queryResult.rows[0];
    const wasInsert = row.was_insert;

    // Eliminar campo técnico antes de retornar
    delete row.was_insert;

    return {
      policy: row,
      was_updated: !wasInsert
    };
  }

  /**
   * Inserta múltiples pólizas en lote (batch).
   * Procesa cada póliza individualmente para asegurar consistencia
   * en caso de errores parciales.
   *
   * @param policies - Array de pólizas a insertar
   * @returns Cantidad total de pólizas insertadas exitosamente
   */
  async insertBatch(policies: Policy[]): Promise<number> {
    let insertedCount = 0;

    // Procesar cada póliza individualmente
    for (const policy of policies) {
      await this.insertPolicy(policy);
      insertedCount++;
    }

    return insertedCount;
  }

  /**
   * Busca pólizas aplicando filtros opcionales y paginación.
   * Construye dinámicamente la consulta SQL basada en los filtros proporcionados.
   *
   * @param filters - Filtros opcionales para refinar la búsqueda
   * @returns Respuesta paginada con las pólizas encontradas y metadatos de paginación
   */
  async findAll(filters: PolicyFilters): Promise<PaginatedResponse<Policy>> {
    // Establecer límites de paginación con valores por defecto y máximos
    const limit = Math.min(filters.limit || 25, 100); // Máximo 100 registros
    const offset = filters.offset || 0;

    // Construir condiciones WHERE dinámicamente
    const whereConditions: string[] = [];
    const parameterValues: unknown[] = [];
    let parameterIndex = 1;

    // Agregar condición de filtro por estado si se especifica
    if (filters.status) {
      whereConditions.push(`status = $${parameterIndex++}`);
      parameterValues.push(filters.status);
    }

    // Agregar condición de filtro por tipo de póliza si se especifica
    if (filters.policy_type) {
      whereConditions.push(`policy_type = $${parameterIndex++}`);
      parameterValues.push(filters.policy_type);
    }

    // Agregar condición de búsqueda por texto si se especifica
    if (filters.q) {
      whereConditions.push(`(policy_number ILIKE $${parameterIndex} OR customer ILIKE $${parameterIndex})`);
      parameterValues.push(`%${filters.q}%`);
      parameterIndex++;
    }

    // Construir cláusula WHERE completa
    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Obtener el total de registros que coinciden con los filtros
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM policies ${whereClause}`,
      parameterValues
    );
    const totalRecords = parseInt(countResult.rows[0].total);

    // Obtener los registros paginados ordenados por fecha de creación descendente
    const itemsResult = await pool.query(
      `SELECT * FROM policies ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${parameterIndex++} OFFSET $${parameterIndex}`,
      [...parameterValues, limit, offset]
    );

    // Retornar respuesta estructurada con items y metadatos de paginación
    return {
      items: itemsResult.rows,
      pagination: {
        limit,
        offset,
        total: totalRecords
      }
    };
  }

  /**
   * Obtiene estadísticas agregadas del portfolio completo de pólizas.
   * Ejecuta múltiples consultas para calcular totales, conteos por estado
   * y sumas de premium por tipo de póliza.
   *
   * @returns Objeto con estadísticas completas del portfolio
   */
  async getSummary(): Promise<PolicySummary> {
    // Consulta para obtener totales generales
    const totalsQuery = await pool.query(`
      SELECT
        COUNT(*)::int as total_policies,
        COALESCE(SUM(premium_usd), 0)::float as total_premium_usd
      FROM policies
    `);

    // Consulta para obtener conteo agrupado por estado
    const statusQuery = await pool.query(`
      SELECT status, COUNT(*)::int as count
      FROM policies
      GROUP BY status
    `);

    // Consulta para obtener suma de premium agrupada por tipo
    const typeQuery = await pool.query(`
      SELECT policy_type, COALESCE(SUM(premium_usd), 0)::float as premium
      FROM policies
      GROUP BY policy_type
    `);

    // Construir objeto de respuesta con valores por defecto
    const countByStatus: Record<string, number> = {
      active: 0,
      expired: 0,
      cancelled: 0
    };

    // Llenar los conteos por estado con los resultados de la consulta
    statusQuery.rows.forEach(row => {
      countByStatus[row.status] = row.count;
    });

    const premiumByType: Record<string, number> = {
      Property: 0,
      Auto: 0,
      Life: 0,
      Health: 0
    };

    // Llenar los premiums por tipo con los resultados de la consulta
    typeQuery.rows.forEach(row => {
      premiumByType[row.policy_type] = row.premium;
    });

    // Retornar el resumen completo
    return {
      total_policies: totalsQuery.rows[0].total_policies,
      total_premium_usd: totalsQuery.rows[0].total_premium_usd,
      count_by_status: countByStatus,
      premium_by_type: premiumByType
    };
  }
}

