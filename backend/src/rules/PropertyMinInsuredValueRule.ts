import { BusinessRule } from './BusinessRule';
import { Policy } from '../types/policy.types';

/**
 * Regla de negocio: Las pólizas de tipo Property deben tener
 * un valor asegurado mínimo de $5,000 USD.
 *
 * Esta clase demuestra herencia al extender BusinessRule
 * e implementar los métodos abstractos requeridos.
 * Representa una regla de validación específica del dominio de seguros.
 */
export class PropertyMinInsuredValueRule extends BusinessRule {
  // Código único para identificar este tipo de error
  readonly errorCode = 'PROPERTY_VALUE_TOO_LOW';

  // Campo específico que se valida en esta regla
  readonly field = 'insured_value_usd';

  // Mensaje descriptivo cuando la validación falla
  readonly errorMessage = 'Property policies must have insured value >= $5,000';

  // Valor mínimo requerido para pólizas Property (en USD)
  private readonly MIN_VALUE = 5000;

  /**
   * Determina si esta regla se aplica a la póliza dada.
   * Esta regla solo es aplicable a pólizas de tipo Property.
   *
   * @param policy - La póliza a evaluar
   * @returns true si la póliza es de tipo Property, false en caso contrario
   */
  appliesTo(policy: Policy): boolean {
    return policy.policy_type === 'Property';
  }

  /**
   * Valida que el valor asegurado de la póliza Property cumpla con el mínimo requerido.
   * La póliza debe tener un valor asegurado de al menos $5,000 USD.
   *
   * @param policy - La póliza Property a validar
   * @returns true si el valor asegurado es >= $5,000, false en caso contrario
   */
  validate(policy: Policy): boolean {
    return policy.insured_value_usd >= this.MIN_VALUE;
  }
}

