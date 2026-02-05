import { BusinessRule } from './BusinessRule';
import { Policy, ValidationError } from '../types/policy.types';
import { PropertyMinInsuredValueRule } from './PropertyMinInsuredValueRule';
import { AutoMinInsuredValueRule } from './AutoMinInsuredValueRule';

/**
 * Motor de reglas que aplica todas las reglas de negocio registradas.
 *
 * Este componente demuestra el principio de POLIMORFISMO en acción:
 * - Trabaja con la abstracción BusinessRule sin conocer detalles concretos
 * - No necesita modificarse cuando se agregan nuevas reglas
 * - Cada regla encapsula su propia lógica de validación
 *
 * Beneficios del diseño:
 * - Open/Closed Principle: Se pueden agregar reglas sin modificar el motor
 * - Single Responsibility: Cada regla maneja su propia validación
 * - Liskov Substitution: Cualquier subclase de BusinessRule funciona correctamente
 * - Extensibility: Fácil agregar nuevas reglas de negocio
 */
export class RuleEngine {
  // Array que almacena todas las reglas registradas
  private rules: BusinessRule[] = [];

  constructor() {
    // Registrar las reglas de negocio requeridas por el challenge
    // Estas reglas validan valores mínimos asegurados por tipo de póliza
    this.registerRule(new PropertyMinInsuredValueRule());
    this.registerRule(new AutoMinInsuredValueRule());
  }

  /**
   * Registra una nueva regla en el motor.
   * Permite extender el sistema con nuevas reglas sin modificar el código existente.
   *
   * @param rule - Cualquier implementación concreta de la interfaz BusinessRule
   */
  registerRule(rule: BusinessRule): void {
    this.rules.push(rule);
  }

  /**
   * Valida una póliza contra todas las reglas registradas.
   *
   * Gracias al polimorfismo, el motor llama al método execute() en cada regla
   * sin saber qué tipo específico de regla es. Cada regla determina
   * internamente si debe aplicarse y cómo realizar la validación.
   *
   * @param policy - La póliza a validar
   * @param rowNumber - Número de fila en el CSV para reportar errores específicos
   * @returns Array de errores de validación (vacío si todas las reglas pasan)
   */
  validate(policy: Policy, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Aplicar cada regla registrada a la póliza
    for (const rule of this.rules) {
      // Polimorfismo: cada regla ejecuta su propia lógica de validación
      const error = rule.execute(policy, rowNumber);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Valida múltiples pólizas y retorna resultados agregados.
   * Útil para procesamiento batch de archivos CSV grandes.
   *
   * @param policies - Array de pólizas con sus números de fila correspondientes
   * @returns Objeto con pólizas válidas, inválidas y todos los errores encontrados
   */
  validateBatch(policies: Array<{ policy: Policy; rowNumber: number }>): {
    valid: Array<{ policy: Policy; rowNumber: number }>;      // Pólizas que pasaron todas las validaciones
    invalid: Array<{ policy: Policy; rowNumber: number; errors: ValidationError[] }>; // Pólizas con errores
    allErrors: ValidationError[];                             // Todos los errores encontrados
  } {
    const valid: Array<{ policy: Policy; rowNumber: number }> = [];
    const invalid: Array<{ policy: Policy; rowNumber: number; errors: ValidationError[] }> = [];
    const allErrors: ValidationError[] = [];

    // Procesar cada póliza individualmente
    for (const item of policies) {
      const errors = this.validate(item.policy, item.rowNumber);

      if (errors.length === 0) {
        // La póliza pasó todas las validaciones
        valid.push(item);
      } else {
        // La póliza tiene errores
        invalid.push({ ...item, errors });
        allErrors.push(...errors);
      }
    }

    return { valid, invalid, allErrors };
  }
}

