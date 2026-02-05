import { Policy, ValidationError } from '../types/policy.types';

/**
 * Clase base abstracta para reglas de negocio.
 * Define el contrato que todas las reglas concretas deben implementar.
 *
 * Este diseño implementa el patrón Strategy:
 * - Cada regla encapsula un algoritmo de validación específico
 * - Las reglas pueden ser intercambiadas y extendidas sin modificar el motor
 * - Permite agregar nuevas reglas de negocio fácilmente
 *
 * También utiliza el patrón Template Method en el método execute():
 * 1. Verifica si la regla se aplica a la póliza
 * 2. Si se aplica, ejecuta la validación específica
 * 3. Retorna el error formateado o null si pasa
 */
export abstract class BusinessRule {
  /** Código único de error para identificar esta regla */
  abstract readonly errorCode: string;

  /** Campo específico que valida esta regla */
  abstract readonly field: string;

  /** Mensaje descriptivo del error cuando la validación falla */
  abstract readonly errorMessage: string;

  /**
   * Determina si esta regla se aplica a la póliza dada.
   * Permite que las reglas sean selectivas (ejemplo: solo para pólizas Property, solo para Auto).
   *
   * @param policy - La póliza a evaluar
   * @returns true si la regla debe aplicarse a esta póliza, false en caso contrario
   */
  abstract appliesTo(policy: Policy): boolean;

  /**
   * Valida la póliza contra esta regla específica.
   * Contiene la lógica de negocio particular de cada regla.
   *
   * @param policy - La póliza a validar
   * @returns true si la póliza cumple la regla, false si no la cumple
   */
  abstract validate(policy: Policy): boolean;

  /**
   * Ejecuta la validación completa siguiendo el patrón Template Method.
   * Este método coordina el proceso de validación:
   * 1. Verifica si la regla se aplica a este tipo de póliza
   * 2. Si se aplica, ejecuta la validación específica
   * 3. Retorna el error formateado o null si la validación pasa
   *
   * @param policy - La póliza a validar
   * @param rowNumber - Número de fila en el CSV para reportar errores específicos
   * @returns ValidationError si la validación falla, null si pasa correctamente
   */
  execute(policy: Policy, rowNumber: number): ValidationError | null {
    // Paso 1: Verificar si la regla se aplica a este tipo de póliza
    // Si no se aplica, la póliza pasa automáticamente esta validación
    if (!this.appliesTo(policy)) {
      return null;
    }

    // Paso 2: Ejecutar la validación específica de la regla
    // Si la validación falla, retornar el error estructurado
    if (!this.validate(policy)) {
      return {
        row_number: rowNumber,
        field: this.field,
        code: this.errorCode,
        message: this.errorMessage
      };
    }

    // Paso 3: La validación pasó correctamente
    return null;
  }
}

