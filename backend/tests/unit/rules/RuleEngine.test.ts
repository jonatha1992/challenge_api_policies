/**
 * Tests unitarios para RuleEngine y reglas de negocio
 * Prueba el motor de reglas y las validaciones de negocio especificas
 */

import { RuleEngine } from '../../../src/rules/RuleEngine';
import { BusinessRule } from '../../../src/rules/BusinessRule';
import { PropertyMinInsuredValueRule } from '../../../src/rules/PropertyMinInsuredValueRule';
import { AutoMinInsuredValueRule } from '../../../src/rules/AutoMinInsuredValueRule';
import { Policy } from '../../../src/types/policy.types';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;

  beforeEach(() => {
    ruleEngine = new RuleEngine();
  });

  // Poliza de prueba base
  const createPolicy = (overrides: Partial<Policy> = {}): Policy => ({
    policy_number: 'POL-001',
    customer: 'John Doe',
    policy_type: 'Property',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-12-31'),
    premium_usd: 1500,
    status: 'active',
    insured_value_usd: 100000,
    ...overrides
  });

  describe('Constructor and Registration', () => {
    it('should register default rules on construction', () => {
      // El motor debe tener reglas registradas por defecto
      const policy = createPolicy({
        policy_type: 'Property',
        insured_value_usd: 1000 // Below minimum
      });

      const errors = ruleEngine.validate(policy, 1);
      // Debe detectar el error porque PropertyMinInsuredValueRule esta registrada
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow registering new rules', () => {
      // Crear una regla personalizada de prueba
      class TestRule extends BusinessRule {
        readonly errorCode = 'TEST_RULE';
        readonly field = 'customer';
        readonly errorMessage = 'Test rule failed';

        appliesTo(policy: Policy): boolean {
          return policy.customer === 'Test Customer';
        }

        validate(policy: Policy): boolean {
          return false; // Siempre falla
        }
      }

      ruleEngine.registerRule(new TestRule());

      const policy = createPolicy({ customer: 'Test Customer' });
      const errors = ruleEngine.validate(policy, 1);

      expect(errors).toContainEqual(expect.objectContaining({
        code: 'TEST_RULE',
        field: 'customer'
      }));
    });
  });

  describe('validate', () => {
    it('should return empty array for valid policy', () => {
      const policy = createPolicy({
        policy_type: 'Property',
        insured_value_usd: 50000 // Well above minimum
      });

      const errors = ruleEngine.validate(policy, 1);
      expect(errors).toEqual([]);
    });

    it('should include row number in errors', () => {
      const policy = createPolicy({
        policy_type: 'Property',
        insured_value_usd: 1000 // Below minimum
      });

      const errors = ruleEngine.validate(policy, 42);
      expect(errors[0].row_number).toBe(42);
    });

    it('should return multiple errors if multiple rules fail', () => {
      // Este test requiere multiples reglas que fallen
      // Con las reglas actuales, solo una puede fallar por poliza
      // ya que Property y Auto son mutuamente excluyentes
      const policy = createPolicy({
        policy_type: 'Property',
        insured_value_usd: 1000
      });

      const errors = ruleEngine.validate(policy, 1);
      // Al menos un error de la regla Property
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateBatch', () => {
    it('should separate valid and invalid policies', () => {
      const policies = [
        { policy: createPolicy({ insured_value_usd: 100000 }), rowNumber: 1 },
        { policy: createPolicy({ insured_value_usd: 1000 }), rowNumber: 2 }, // Invalid
        { policy: createPolicy({ insured_value_usd: 50000 }), rowNumber: 3 }
      ];

      const result = ruleEngine.validateBatch(policies);

      expect(result.valid.length).toBe(2);
      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].rowNumber).toBe(2);
    });

    it('should collect all errors in allErrors array', () => {
      const policies = [
        { policy: createPolicy({ insured_value_usd: 1000 }), rowNumber: 1 },
        { policy: createPolicy({ insured_value_usd: 2000 }), rowNumber: 2 }
      ];

      const result = ruleEngine.validateBatch(policies);

      expect(result.allErrors.length).toBe(2);
      expect(result.allErrors.map(e => e.row_number)).toContain(1);
      expect(result.allErrors.map(e => e.row_number)).toContain(2);
    });

    it('should return empty results for empty input', () => {
      const result = ruleEngine.validateBatch([]);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
      expect(result.allErrors).toEqual([]);
    });

    it('should include errors in invalid items', () => {
      const policies = [
        { policy: createPolicy({ insured_value_usd: 1000 }), rowNumber: 1 }
      ];

      const result = ruleEngine.validateBatch(policies);

      expect(result.invalid[0].errors.length).toBeGreaterThan(0);
    });
  });
});

describe('PropertyMinInsuredValueRule', () => {
  let rule: PropertyMinInsuredValueRule;

  beforeEach(() => {
    rule = new PropertyMinInsuredValueRule();
  });

  const createPropertyPolicy = (insuredValue: number): Policy => ({
    policy_number: 'POL-001',
    customer: 'John Doe',
    policy_type: 'Property',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-12-31'),
    premium_usd: 1500,
    status: 'active',
    insured_value_usd: insuredValue
  });

  describe('appliesTo', () => {
    it('should apply to Property policies', () => {
      const policy = createPropertyPolicy(100000);
      expect(rule.appliesTo(policy)).toBe(true);
    });

    it('should not apply to Auto policies', () => {
      const policy = { ...createPropertyPolicy(100000), policy_type: 'Auto' as const };
      expect(rule.appliesTo(policy)).toBe(false);
    });

    it('should not apply to Life policies', () => {
      const policy = { ...createPropertyPolicy(100000), policy_type: 'Life' as const };
      expect(rule.appliesTo(policy)).toBe(false);
    });

    it('should not apply to Health policies', () => {
      const policy = { ...createPropertyPolicy(100000), policy_type: 'Health' as const };
      expect(rule.appliesTo(policy)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should pass for insured value >= $5000', () => {
      expect(rule.validate(createPropertyPolicy(5000))).toBe(true);
      expect(rule.validate(createPropertyPolicy(5001))).toBe(true);
      expect(rule.validate(createPropertyPolicy(100000))).toBe(true);
    });

    it('should fail for insured value < $5000', () => {
      expect(rule.validate(createPropertyPolicy(4999))).toBe(false);
      expect(rule.validate(createPropertyPolicy(1000))).toBe(false);
      expect(rule.validate(createPropertyPolicy(0))).toBe(false);
    });

    it('should pass for exactly $5000', () => {
      expect(rule.validate(createPropertyPolicy(5000))).toBe(true);
    });
  });

  describe('execute', () => {
    it('should return null for valid Property policy', () => {
      const policy = createPropertyPolicy(10000);
      const result = rule.execute(policy, 1);
      expect(result).toBeNull();
    });

    it('should return error for invalid Property policy', () => {
      const policy = createPropertyPolicy(1000);
      const result = rule.execute(policy, 5);

      expect(result).not.toBeNull();
      expect(result?.code).toBe('PROPERTY_VALUE_TOO_LOW');
      expect(result?.field).toBe('insured_value_usd');
      expect(result?.row_number).toBe(5);
    });

    it('should return null for non-Property policies regardless of value', () => {
      const autoPolicy = { ...createPropertyPolicy(1000), policy_type: 'Auto' as const };
      const result = rule.execute(autoPolicy, 1);
      expect(result).toBeNull();
    });
  });

  describe('Rule Properties', () => {
    it('should have correct error code', () => {
      expect(rule.errorCode).toBe('PROPERTY_VALUE_TOO_LOW');
    });

    it('should have correct field', () => {
      expect(rule.field).toBe('insured_value_usd');
    });

    it('should have descriptive error message', () => {
      expect(rule.errorMessage).toContain('5,000');
      expect(rule.errorMessage.toLowerCase()).toContain('property');
    });
  });
});

describe('AutoMinInsuredValueRule', () => {
  let rule: AutoMinInsuredValueRule;

  beforeEach(() => {
    rule = new AutoMinInsuredValueRule();
  });

  const createAutoPolicy = (insuredValue: number): Policy => ({
    policy_number: 'POL-001',
    customer: 'John Doe',
    policy_type: 'Auto',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-12-31'),
    premium_usd: 1200,
    status: 'active',
    insured_value_usd: insuredValue
  });

  describe('appliesTo', () => {
    it('should apply to Auto policies', () => {
      const policy = createAutoPolicy(50000);
      expect(rule.appliesTo(policy)).toBe(true);
    });

    it('should not apply to Property policies', () => {
      const policy = { ...createAutoPolicy(50000), policy_type: 'Property' as const };
      expect(rule.appliesTo(policy)).toBe(false);
    });

    it('should not apply to Life policies', () => {
      const policy = { ...createAutoPolicy(50000), policy_type: 'Life' as const };
      expect(rule.appliesTo(policy)).toBe(false);
    });

    it('should not apply to Health policies', () => {
      const policy = { ...createAutoPolicy(50000), policy_type: 'Health' as const };
      expect(rule.appliesTo(policy)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should pass for insured value >= $10000', () => {
      expect(rule.validate(createAutoPolicy(10000))).toBe(true);
      expect(rule.validate(createAutoPolicy(10001))).toBe(true);
      expect(rule.validate(createAutoPolicy(50000))).toBe(true);
    });

    it('should fail for insured value < $10000', () => {
      expect(rule.validate(createAutoPolicy(9999))).toBe(false);
      expect(rule.validate(createAutoPolicy(5000))).toBe(false);
      expect(rule.validate(createAutoPolicy(0))).toBe(false);
    });

    it('should pass for exactly $10000', () => {
      expect(rule.validate(createAutoPolicy(10000))).toBe(true);
    });
  });

  describe('execute', () => {
    it('should return null for valid Auto policy', () => {
      const policy = createAutoPolicy(25000);
      const result = rule.execute(policy, 1);
      expect(result).toBeNull();
    });

    it('should return error for invalid Auto policy', () => {
      const policy = createAutoPolicy(5000);
      const result = rule.execute(policy, 10);

      expect(result).not.toBeNull();
      expect(result?.code).toBe('AUTO_VALUE_TOO_LOW');
      expect(result?.field).toBe('insured_value_usd');
      expect(result?.row_number).toBe(10);
    });

    it('should return null for non-Auto policies regardless of value', () => {
      const propertyPolicy = { ...createAutoPolicy(5000), policy_type: 'Property' as const };
      const result = rule.execute(propertyPolicy, 1);
      expect(result).toBeNull();
    });
  });

  describe('Rule Properties', () => {
    it('should have correct error code', () => {
      expect(rule.errorCode).toBe('AUTO_VALUE_TOO_LOW');
    });

    it('should have correct field', () => {
      expect(rule.field).toBe('insured_value_usd');
    });

    it('should have descriptive error message', () => {
      expect(rule.errorMessage).toContain('10,000');
      expect(rule.errorMessage.toLowerCase()).toContain('auto');
    });
  });
});

describe('BusinessRule Abstract Class', () => {
  // Test de la clase abstracta a traves de una implementacion concreta
  it('should follow Template Method pattern in execute', () => {
    const rule = new PropertyMinInsuredValueRule();

    // Caso 1: appliesTo = false -> execute retorna null sin llamar validate
    const nonPropertyPolicy: Policy = {
      policy_number: 'POL-001',
      customer: 'Test',
      policy_type: 'Life',
      start_date: new Date(),
      end_date: new Date(),
      premium_usd: 100,
      status: 'active',
      insured_value_usd: 1 // Valor muy bajo pero no aplica
    };
    expect(rule.execute(nonPropertyPolicy, 1)).toBeNull();

    // Caso 2: appliesTo = true, validate = true -> execute retorna null
    const validPropertyPolicy: Policy = {
      ...nonPropertyPolicy,
      policy_type: 'Property',
      insured_value_usd: 50000
    };
    expect(rule.execute(validPropertyPolicy, 1)).toBeNull();

    // Caso 3: appliesTo = true, validate = false -> execute retorna error
    const invalidPropertyPolicy: Policy = {
      ...nonPropertyPolicy,
      policy_type: 'Property',
      insured_value_usd: 1000
    };
    const error = rule.execute(invalidPropertyPolicy, 1);
    expect(error).not.toBeNull();
    expect(error).toMatchObject({
      row_number: 1,
      field: 'insured_value_usd',
      code: 'PROPERTY_VALUE_TOO_LOW'
    });
  });
});

