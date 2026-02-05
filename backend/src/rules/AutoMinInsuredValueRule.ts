import { BusinessRule } from './BusinessRule';
import { Policy } from '../types/policy.types';

/**
 * Regla de negocio: Las pólizas de tipo Auto deben tener
 * un valor asegurado mínimo de $10,000 USD.
 *
 * Esta clase demuestra herencia al extender BusinessRule
 * e implementar los métodos abstractos requeridos.
 * Representa una regla de validación específica para pólizas de automóvil.
 */
export class AutoMinInsuredValueRule extends BusinessRule {
  // Código único para identificar este tipo de error
  readonly errorCode = 'AUTO_VALUE_TOO_LOW';

  // Campo específico que se valida en esta regla
  readonly field = 'insured_value_usd';

  // Mensaje descriptivo cuando la validación falla
  readonly errorMessage = 'Auto policies must have insured value >= $10,000';

  // Valor mínimo requerido para pólizas Auto (en USD)
  private readonly MIN_VALUE = 10000;

  /**
   * Determina si esta regla se aplica a la póliza dada.
   * Esta regla solo es aplicable a pólizas de tipo Auto.
   *
   * @param policy - La póliza a evaluar
   * @returns true si la póliza es de tipo Auto, false en caso contrario
   */
  appliesTo(policy: Policy): boolean {
    return policy.policy_type === 'Auto';
  }

  /**
   * Valida que el valor asegurado de la póliza Auto cumpla con el mínimo requerido.
   * La póliza debe tener un valor asegurado de al menos $10,000 USD.
   *
   * @param policy - La póliza Auto a validar
   * @returns true si el valor asegurado es >= $10,000, false en caso contrario
   */
  validate(policy: Policy): boolean {
    return policy.insured_value_usd >= this.MIN_VALUE;
  }
}

