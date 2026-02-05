/**
 * Tests unitarios para ValidationService
 * Prueba las validaciones tecnicas de datos de polizas
 */

import { ValidationService } from '../../../src/services/ValidationService';
import { PolicyInput } from '../../../src/types/policy.types';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('validateTechnical', () => {
    // Datos de prueba validos
    const validPolicyInput: PolicyInput = {
      policy_number: 'POL-001',
      customer: 'John Doe',
      policy_type: 'Property',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      premium_usd: '1500',
      status: 'active',
      insured_value_usd: '100000'
    };

    it('should return empty array for valid policy input', () => {
      const errors = validationService.validateTechnical(validPolicyInput, 1);
      expect(errors).toEqual([]);
    });

    describe('Required Fields Validation', () => {
      it('should return error when policy_number is missing', () => {
        const input = { ...validPolicyInput, policy_number: '' };
        const errors = validationService.validateTechnical(input, 1);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'policy_number',
          code: 'REQUIRED_FIELD',
          row_number: 1
        }));
      });

      it('should return error when policy_number is only whitespace', () => {
        const input = { ...validPolicyInput, policy_number: '   ' };
        const errors = validationService.validateTechnical(input, 1);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'policy_number',
          code: 'REQUIRED_FIELD'
        }));
      });

      it('should return error when customer is missing', () => {
        const input = { ...validPolicyInput, customer: '' };
        const errors = validationService.validateTechnical(input, 1);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'customer',
          code: 'REQUIRED_FIELD',
          row_number: 1
        }));
      });
    });

    describe('Date Fields Validation', () => {
      it('should return error for invalid start_date format', () => {
        const input = { ...validPolicyInput, start_date: 'invalid-date' };
        const errors = validationService.validateTechnical(input, 2);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'start_date',
          code: 'INVALID_DATE_FORMAT',
          row_number: 2
        }));
      });

      it('should return error for invalid end_date format', () => {
        const input = { ...validPolicyInput, end_date: 'not-a-date' };
        const errors = validationService.validateTechnical(input, 3);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'end_date',
          code: 'INVALID_DATE_FORMAT',
          row_number: 3
        }));
      });

      it('should return error when start_date is after end_date', () => {
        const input = {
          ...validPolicyInput,
          start_date: '2024-12-31',
          end_date: '2024-01-01'
        };
        const errors = validationService.validateTechnical(input, 4);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'start_date',
          code: 'INVALID_DATE_RANGE',
          row_number: 4
        }));
      });

      it('should return error when start_date equals end_date', () => {
        const input = {
          ...validPolicyInput,
          start_date: '2024-06-15',
          end_date: '2024-06-15'
        };
        const errors = validationService.validateTechnical(input, 5);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'start_date',
          code: 'INVALID_DATE_RANGE'
        }));
      });

      it('should accept various valid date formats', () => {
        const input = {
          ...validPolicyInput,
          start_date: '2024-01-15',
          end_date: '2025-01-15'
        };
        const errors = validationService.validateTechnical(input, 1);
        expect(errors).toEqual([]);
      });
    });

    describe('Status Field Validation', () => {
      it('should accept valid status "active"', () => {
        const input = { ...validPolicyInput, status: 'active' };
        const errors = validationService.validateTechnical(input, 1);
        expect(errors.filter(e => e.field === 'status')).toHaveLength(0);
      });

      it('should accept valid status "expired"', () => {
        const input = { ...validPolicyInput, status: 'expired' };
        const errors = validationService.validateTechnical(input, 1);
        expect(errors.filter(e => e.field === 'status')).toHaveLength(0);
      });

      it('should accept valid status "cancelled"', () => {
        const input = { ...validPolicyInput, status: 'cancelled' };
        const errors = validationService.validateTechnical(input, 1);
        expect(errors.filter(e => e.field === 'status')).toHaveLength(0);
      });

      it('should return error for invalid status', () => {
        const input = { ...validPolicyInput, status: 'invalid_status' };
        const errors = validationService.validateTechnical(input, 6);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'status',
          code: 'INVALID_STATUS',
          row_number: 6
        }));
      });

      it('should return error for empty status', () => {
        const input = { ...validPolicyInput, status: '' };
        const errors = validationService.validateTechnical(input, 7);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'status',
          code: 'INVALID_STATUS'
        }));
      });
    });

    describe('Policy Type Validation', () => {
      const validTypes = ['Property', 'Auto', 'Life', 'Health'];

      validTypes.forEach(type => {
        it(`should accept valid policy type "${type}"`, () => {
          const input = { ...validPolicyInput, policy_type: type };
          const errors = validationService.validateTechnical(input, 1);
          expect(errors.filter(e => e.field === 'policy_type')).toHaveLength(0);
        });
      });

      it('should return error for invalid policy type', () => {
        const input = { ...validPolicyInput, policy_type: 'InvalidType' };
        const errors = validationService.validateTechnical(input, 8);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'policy_type',
          code: 'INVALID_POLICY_TYPE',
          row_number: 8
        }));
      });

      it('should return error for lowercase policy type', () => {
        const input = { ...validPolicyInput, policy_type: 'property' };
        const errors = validationService.validateTechnical(input, 9);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'policy_type',
          code: 'INVALID_POLICY_TYPE'
        }));
      });
    });

    describe('Numeric Fields Validation', () => {
      it('should accept valid premium_usd as string', () => {
        const input = { ...validPolicyInput, premium_usd: '1500.50' };
        const errors = validationService.validateTechnical(input, 1);
        expect(errors.filter(e => e.field === 'premium_usd')).toHaveLength(0);
      });

      it('should accept valid premium_usd as number', () => {
        const input = { ...validPolicyInput, premium_usd: 1500 };
        const errors = validationService.validateTechnical(input, 1);
        expect(errors.filter(e => e.field === 'premium_usd')).toHaveLength(0);
      });

      it('should return error for negative premium_usd', () => {
        const input = { ...validPolicyInput, premium_usd: '-100' };
        const errors = validationService.validateTechnical(input, 10);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'premium_usd',
          code: 'INVALID_NUMBER',
          row_number: 10
        }));
      });

      it('should return error for non-numeric premium_usd', () => {
        const input = { ...validPolicyInput, premium_usd: 'abc' };
        const errors = validationService.validateTechnical(input, 11);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'premium_usd',
          code: 'INVALID_NUMBER'
        }));
      });

      it('should accept zero as valid premium_usd', () => {
        const input = { ...validPolicyInput, premium_usd: '0' };
        const errors = validationService.validateTechnical(input, 1);
        expect(errors.filter(e => e.field === 'premium_usd')).toHaveLength(0);
      });

      it('should return error for negative insured_value_usd', () => {
        const input = { ...validPolicyInput, insured_value_usd: '-5000' };
        const errors = validationService.validateTechnical(input, 12);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'insured_value_usd',
          code: 'INVALID_NUMBER',
          row_number: 12
        }));
      });

      it('should return error for non-numeric insured_value_usd', () => {
        const input = { ...validPolicyInput, insured_value_usd: 'invalid' };
        const errors = validationService.validateTechnical(input, 13);

        expect(errors).toContainEqual(expect.objectContaining({
          field: 'insured_value_usd',
          code: 'INVALID_NUMBER'
        }));
      });
    });

    describe('Multiple Errors', () => {
      it('should return multiple errors for multiple invalid fields', () => {
        const input: PolicyInput = {
          policy_number: '',
          customer: '',
          policy_type: 'invalid',
          start_date: 'bad-date',
          end_date: 'bad-date',
          premium_usd: 'not-a-number',
          status: 'unknown',
          insured_value_usd: '-100'
        };

        const errors = validationService.validateTechnical(input, 1);
        expect(errors.length).toBeGreaterThan(1);
        expect(errors.map(e => e.field)).toContain('policy_number');
        expect(errors.map(e => e.field)).toContain('customer');
        expect(errors.map(e => e.field)).toContain('policy_type');
        expect(errors.map(e => e.field)).toContain('status');
      });
    });
  });

  describe('parseToPolicy', () => {
    const validInput: PolicyInput = {
      policy_number: '  POL-001  ',
      customer: '  John Doe  ',
      policy_type: 'Property',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      premium_usd: '1500.50',
      status: 'active',
      insured_value_usd: '100000.75'
    };

    it('should trim whitespace from string fields', () => {
      const policy = validationService.parseToPolicy(validInput);

      expect(policy.policy_number).toBe('POL-001');
      expect(policy.customer).toBe('John Doe');
    });

    it('should parse dates correctly', () => {
      const policy = validationService.parseToPolicy(validInput);

      expect(policy.start_date).toBeInstanceOf(Date);
      expect(policy.end_date).toBeInstanceOf(Date);
      // Use UTC methods to avoid timezone issues
      expect(policy.start_date.getUTCFullYear()).toBe(2024);
      expect(policy.start_date.getUTCMonth()).toBe(0); // January
      expect(policy.start_date.getUTCDate()).toBe(1);
    });

    it('should parse numeric strings to numbers', () => {
      const policy = validationService.parseToPolicy(validInput);

      expect(typeof policy.premium_usd).toBe('number');
      expect(policy.premium_usd).toBe(1500.50);
      expect(typeof policy.insured_value_usd).toBe('number');
      expect(policy.insured_value_usd).toBe(100000.75);
    });

    it('should handle numeric values passed as numbers', () => {
      const input = {
        ...validInput,
        premium_usd: 2000,
        insured_value_usd: 50000
      };
      const policy = validationService.parseToPolicy(input);

      expect(policy.premium_usd).toBe(2000);
      expect(policy.insured_value_usd).toBe(50000);
    });

    it('should set correct policy type', () => {
      const policy = validationService.parseToPolicy(validInput);
      expect(policy.policy_type).toBe('Property');
    });

    it('should set correct status', () => {
      const policy = validationService.parseToPolicy(validInput);
      expect(policy.status).toBe('active');
    });
  });
});
