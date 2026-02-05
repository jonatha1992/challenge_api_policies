import { pool } from '../config/database';
import { Operation, OperationStatus } from '../types/operation.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio para gestionar operaciones y trazabilidad.
 * Cada petición al endpoint /upload registra una operación en la base de datos
 * para mantener un registro completo de todas las actividades del sistema.
 */
export class OperationService {
  /**
   * Crea una nueva operación con estado RECEIVED.
   * Esta función se llama al inicio de cada carga de archivos para crear
   * un registro de trazabilidad que se actualizará a lo largo del proceso.
   *
   * @param endpoint - El endpoint HTTP que recibió la petición (ej: '/upload')
   * @param correlationId - ID de correlación único para rastrear la petición completa
   * @returns La operación creada con todos sus campos inicializados
   */
  async createOperation(
    endpoint: string,
    correlationId: string
  ): Promise<Operation> {
    // Crear el objeto operación con valores iniciales
    const operation: Operation = {
      id: uuidv4(),                    // Generar ID único para la operación
      created_at: new Date(),          // Timestamp de creación
      endpoint,                        // Endpoint que procesa la operación
      status: 'RECEIVED',              // Estado inicial: petición recibida
      correlation_id: correlationId,   // ID para correlacionar logs y operaciones
      rows_inserted: 0,               // Inicialmente no se han insertado filas
      rows_rejected: 0                // Inicialmente no se han rechazado filas
    };

    // Insertar la operación en la base de datos
    await pool.query(
      `INSERT INTO operations (id, endpoint, status, correlation_id)
       VALUES ($1, $2, $3, $4)`,
      [operation.id, operation.endpoint, operation.status, operation.correlation_id]
    );

    return operation;
  }

  /**
   * Actualiza una operación existente con nuevos valores.
   * Esta función permite modificar el estado y métricas de una operación
   * a medida que avanza el procesamiento.
   *
   * @param id - ID único de la operación a actualizar
   * @param updates - Objeto con los campos a actualizar (solo los campos presentes se modifican)
   */
  async updateOperation(
    id: string,
    updates: Partial<Operation>
  ): Promise<void> {
    // Construir dinámicamente la consulta SQL basada en los campos a actualizar
    const fieldsToUpdate: string[] = [];
    const parameterValues: unknown[] = [];
    let parameterIndex = 1;

    // Agregar cada campo a actualizar a la consulta
    if (updates.status !== undefined) {
      fieldsToUpdate.push(`status = $${parameterIndex++}`);
      parameterValues.push(updates.status);
    }
    if (updates.rows_inserted !== undefined) {
      fieldsToUpdate.push(`rows_inserted = $${parameterIndex++}`);
      parameterValues.push(updates.rows_inserted);
    }
    if (updates.rows_rejected !== undefined) {
      fieldsToUpdate.push(`rows_rejected = $${parameterIndex++}`);
      parameterValues.push(updates.rows_rejected);
    }
    if (updates.duration_ms !== undefined) {
      fieldsToUpdate.push(`duration_ms = $${parameterIndex++}`);
      parameterValues.push(updates.duration_ms);
    }
    if (updates.error_summary !== undefined) {
      fieldsToUpdate.push(`error_summary = $${parameterIndex++}`);
      parameterValues.push(updates.error_summary);
    }

    // Si no hay campos para actualizar, salir temprano
    if (fieldsToUpdate.length === 0) {
      return;
    }

    // Agregar el ID de la operación como último parámetro
    parameterValues.push(id);

    // Ejecutar la consulta de actualización
    await pool.query(
      `UPDATE operations SET ${fieldsToUpdate.join(', ')} WHERE id = $${parameterIndex}`,
      parameterValues
    );
  }

  /**
   * Obtiene una operación por su ID único.
   * Útil para consultar el estado de una operación específica
   * o para mostrar detalles en la interfaz de usuario.
   *
   * @param id - ID único de la operación a buscar
   * @returns La operación completa si existe, o null si no se encuentra
   */
  async getOperation(id: string): Promise<Operation | null> {
    // Ejecutar consulta para obtener la operación por ID
    const queryResult = await pool.query(
      'SELECT * FROM operations WHERE id = $1',
      [id]
    );

    // Retornar la primera fila si existe, o null si no hay resultados
    return queryResult.rows[0] || null;
  }
}

