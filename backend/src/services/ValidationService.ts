import { PolicyInput, Policy, ValidationError, PolicyStatus, PolicyType } from '../types/policy.types';

// Constantes que definen los valores válidos para estados y tipos de póliza
const VALID_STATUSES: PolicyStatus[] = ['active', 'expired', 'cancelled'];
const VALID_POLICY_TYPES: PolicyType[] = ['Property', 'Auto', 'Life', 'Health'];

/**
 * Servicio de validaciones técnicas (no de negocio).
 * Este servicio se encarga únicamente de validaciones de formato, estructura y tipos de datos.
 * Las validaciones de negocio (reglas específicas del dominio) se manejan en el RuleEngine.
 */
export class ValidationService {
  /**
   * Realiza validaciones técnicas sobre los datos de entrada del CSV.
   * Estas validaciones verifican el formato, estructura y tipos de datos,
   * pero no incluyen reglas de negocio específicas.
   *
   * @param input - Datos crudos leídos del archivo CSV
   * @param rowNumber - Número de fila en el CSV para reportar errores específicos
   * @returns Array de errores técnicos encontrados durante la validación
   */
  validateTechnical(input: PolicyInput, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. Validar que el número de póliza sea obligatorio y no esté vacío
    this.validateRequiredField(input.policy_number, 'policy_number', 'policy_number is required', rowNumber, errors);

    // 2. Validar que el nombre del cliente sea obligatorio y no esté vacío
    this.validateRequiredField(input.customer, 'customer', 'customer is required', rowNumber, errors);

    // 3. Validar que las fechas tengan formato correcto
    this.validateDateFields(input.start_date, input.end_date, rowNumber, errors);

    // 4. Validar que el estado de la póliza sea uno de los valores permitidos
    this.validateStatusField(input.status, rowNumber, errors);

    // 5. Validar que el tipo de póliza sea uno de los valores permitidos
    this.validatePolicyTypeField(input.policy_type, rowNumber, errors);

    // 6. Validar que el premium sea un número positivo
    this.validateNumericField(input.premium_usd, 'premium_usd', 'premium_usd must be a positive number', rowNumber, errors);

    // 7. Validar que el valor asegurado sea un número positivo
    this.validateNumericField(input.insured_value_usd, 'insured_value_usd', 'insured_value_usd must be a positive number', rowNumber, errors);

    return errors;
  }

  /**
   * Valida que un campo requerido no esté vacío.
   * @param value - Valor del campo a validar
   * @param fieldName - Nombre del campo para el mensaje de error
   * @param errorMessage - Mensaje de error si la validación falla
   * @param rowNumber - Número de fila para el reporte de error
   * @param errors - Array donde agregar el error si existe
   */
  private validateRequiredField(
    value: string | undefined,
    fieldName: string,
    errorMessage: string,
    rowNumber: number,
    errors: ValidationError[]
  ): void {
    if (!value || value.trim() === '') {
      errors.push({
        row_number: rowNumber,
        field: fieldName,
        code: 'REQUIRED_FIELD',
        message: errorMessage
      });
    }
  }

  /**
   * Valida que las fechas tengan formato correcto y que la fecha de inicio sea anterior a la de fin.
   * @param startDateStr - Fecha de inicio como string
   * @param endDateStr - Fecha de fin como string
   * @param rowNumber - Número de fila para el reporte de error
   * @param errors - Array donde agregar los errores si existen
   */
  private validateDateFields(
    startDateStr: string,
    endDateStr: string,
    rowNumber: number,
    errors: ValidationError[]
  ): void {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Validar formato de fecha de inicio
    if (isNaN(startDate.getTime())) {
      errors.push({
        row_number: rowNumber,
        field: 'start_date',
        code: 'INVALID_DATE_FORMAT',
        message: 'Invalid start_date format'
      });
    }

    // Validar formato de fecha de fin
    if (isNaN(endDate.getTime())) {
      errors.push({
        row_number: rowNumber,
        field: 'end_date',
        code: 'INVALID_DATE_FORMAT',
        message: 'Invalid end_date format'
      });
    }

    // Validar que la fecha de inicio sea anterior a la fecha de fin
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate >= endDate) {
      errors.push({
        row_number: rowNumber,
        field: 'start_date',
        code: 'INVALID_DATE_RANGE',
        message: 'start_date must be before end_date'
      });
    }
  }

  /**
   * Valida que el estado de la póliza sea uno de los valores permitidos.
   * @param status - Estado a validar
   * @param rowNumber - Número de fila para el reporte de error
   * @param errors - Array donde agregar el error si existe
   */
  private validateStatusField(status: string, rowNumber: number, errors: ValidationError[]): void {
    if (!VALID_STATUSES.includes(status as PolicyStatus)) {
      errors.push({
        row_number: rowNumber,
        field: 'status',
        code: 'INVALID_STATUS',
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }
  }

  /**
   * Valida que el tipo de póliza sea uno de los valores permitidos.
   * @param policyType - Tipo de póliza a validar
   * @param rowNumber - Número de fila para el reporte de error
   * @param errors - Array donde agregar el error si existe
   */
  private validatePolicyTypeField(policyType: string, rowNumber: number, errors: ValidationError[]): void {
    if (!VALID_POLICY_TYPES.includes(policyType as PolicyType)) {
      errors.push({
        row_number: rowNumber,
        field: 'policy_type',
        code: 'INVALID_POLICY_TYPE',
        message: `policy_type must be one of: ${VALID_POLICY_TYPES.join(', ')}`
      });
    }
  }

  /**
   * Valida que un campo numérico sea un número positivo válido.
   * @param value - Valor a validar (puede ser string o number)
   * @param fieldName - Nombre del campo para el mensaje de error
   * @param errorMessage - Mensaje de error si la validación falla
   * @param rowNumber - Número de fila para el reporte de error
   * @param errors - Array donde agregar el error si existe
   */
  private validateNumericField(
    value: string | number,
    fieldName: string,
    errorMessage: string,
    rowNumber: number,
    errors: ValidationError[]
  ): void {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue) || numericValue < 0) {
      errors.push({
        row_number: rowNumber,
        field: fieldName,
        code: 'INVALID_NUMBER',
        message: errorMessage
      });
    }
  }

  /**
   * Convierte los datos crudos del CSV a un objeto Policy con tipos correctos.
   * Esta función asume que los datos ya han sido validados técnicamente.
   *
   * @param input - Datos crudos leídos del CSV
   * @returns Objeto Policy con tipos de datos correctos y valores parseados
   */
  parseToPolicy(input: PolicyInput): Policy {
    return {
      policy_number: input.policy_number.trim(),
      customer: input.customer.trim(),
      policy_type: input.policy_type as PolicyType,
      start_date: new Date(input.start_date),
      end_date: new Date(input.end_date),
      premium_usd: typeof input.premium_usd === 'string'
        ? parseFloat(input.premium_usd)
        : input.premium_usd,
      status: input.status as PolicyStatus,
      insured_value_usd: typeof input.insured_value_usd === 'string'
        ? parseFloat(input.insured_value_usd)
        : input.insured_value_usd
    };
  }
}

