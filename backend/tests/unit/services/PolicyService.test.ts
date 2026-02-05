/**
 * Tests unitarios para PolicyService
 * Prueba operaciones CRUD y estadisticas de polizas
 */

import { PolicyService } from '../../../src/services/PolicyService';
import { Policy, PolicyFilters } from '../../../src/types/policy.types';

// Mock de la conexion a base de datos
const mockQuery = jest.fn();
jest.mock('../../../src/config/database', () => {
  return {
    pool: {
      query: jest.fn()
    }
  };
});

// Import after mock
import { pool } from '../../../src/config/database';

describe('PolicyService', () => {
  let policyService: PolicyService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    policyService = new PolicyService();
    mockQuery = pool.query as jest.Mock;
    jest.clearAllMocks();
  });

  // Datos de prueba
  const samplePolicy: Policy = {
    policy_number: 'POL-001',
    customer: 'John Doe',
    policy_type: 'Property',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-12-31'),
    premium_usd: 1500,
    status: 'active',
    insured_value_usd: 100000
  };

  const samplePolicyWithId: Policy = {
    ...samplePolicy,
    id: 1,
    created_at: new Date()
  };

  describe('insertPolicy', () => {
    it('should insert a new policy and return it', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [samplePolicyWithId]
      });

      const result = await policyService.insertPolicy(samplePolicy);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO policies'),
        expect.arrayContaining([
          samplePolicy.policy_number,
          samplePolicy.customer,
          samplePolicy.policy_type,
          samplePolicy.start_date,
          samplePolicy.end_date,
          samplePolicy.premium_usd,
          samplePolicy.status,
          samplePolicy.insured_value_usd
        ])
      );
      expect(result).toEqual(samplePolicyWithId);
    });

    it('should handle upsert on conflict', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...samplePolicyWithId, premium_usd: 2000 }]
      });

      const updatedPolicy = { ...samplePolicy, premium_usd: 2000 };
      const result = await policyService.insertPolicy(updatedPolicy);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array)
      );
      expect(result.premium_usd).toBe(2000);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(policyService.insertPolicy(samplePolicy))
        .rejects
        .toThrow('Database connection failed');
    });
  });

  describe('insertBatch', () => {
    it('should insert multiple policies and return count', async () => {
      const policies = [
        samplePolicy,
        { ...samplePolicy, policy_number: 'POL-002' },
        { ...samplePolicy, policy_number: 'POL-003' }
      ];

      mockQuery.mockResolvedValue({ rows: [samplePolicyWithId] });

      const count = await policyService.insertBatch(policies);

      expect(count).toBe(3);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should return 0 for empty array', async () => {
      const count = await policyService.insertBatch([]);

      expect(count).toBe(0);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should stop on first failure', async () => {
      const policies = [
        samplePolicy,
        { ...samplePolicy, policy_number: 'POL-002' }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [samplePolicyWithId] })
        .mockRejectedValueOnce(new Error('Constraint violation'));

      await expect(policyService.insertBatch(policies))
        .rejects
        .toThrow('Constraint violation');
    });
  });

  describe('findAll', () => {
    const mockPolicies = [
      samplePolicyWithId,
      { ...samplePolicyWithId, id: 2, policy_number: 'POL-002' }
    ];

    it('should return paginated policies with default filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '10' }] })
        .mockResolvedValueOnce({ rows: mockPolicies });

      const filters: PolicyFilters = {};
      const result = await policyService.findAll(filters);

      expect(result.items).toEqual(mockPolicies);
      expect(result.pagination).toEqual({
        limit: 25,
        offset: 0,
        total: 10
      });
    });

    it('should apply status filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '5' }] })
        .mockResolvedValueOnce({ rows: mockPolicies });

      const filters: PolicyFilters = { status: 'active' };
      await policyService.findAll(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1'),
        ['active']
      );
    });

    it('should apply policy_type filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        .mockResolvedValueOnce({ rows: mockPolicies });

      const filters: PolicyFilters = { policy_type: 'Property' };
      await policyService.findAll(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE policy_type = $1'),
        ['Property']
      );
    });

    it('should apply text search filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        .mockResolvedValueOnce({ rows: mockPolicies });

      const filters: PolicyFilters = { q: 'John' };
      await policyService.findAll(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%John%']
      );
    });

    it('should apply multiple filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [mockPolicies[0]] });

      const filters: PolicyFilters = {
        status: 'active',
        policy_type: 'Property',
        q: 'POL'
      };
      await policyService.findAll(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND'),
        expect.arrayContaining(['active', 'Property', '%POL%'])
      );
    });

    it('should respect pagination limits', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({ rows: mockPolicies });

      const filters: PolicyFilters = { limit: 50, offset: 20 };
      const result = await policyService.findAll(filters);

      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.offset).toBe(20);
    });

    it('should cap limit at maximum of 100', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '500' }] })
        .mockResolvedValueOnce({ rows: mockPolicies });

      const filters: PolicyFilters = { limit: 200 };
      const result = await policyService.findAll(filters);

      expect(result.pagination.limit).toBe(100);
    });
  });

  describe('getSummary', () => {
    it('should return complete portfolio summary', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total_policies: 100, total_premium_usd: 150000 }]
        })
        .mockResolvedValueOnce({
          rows: [
            { status: 'active', count: 70 },
            { status: 'expired', count: 20 },
            { status: 'cancelled', count: 10 }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { policy_type: 'Property', premium: 60000 },
            { policy_type: 'Auto', premium: 50000 },
            { policy_type: 'Life', premium: 30000 },
            { policy_type: 'Health', premium: 10000 }
          ]
        });

      const summary = await policyService.getSummary();

      expect(summary).toEqual({
        total_policies: 100,
        total_premium_usd: 150000,
        count_by_status: {
          active: 70,
          expired: 20,
          cancelled: 10
        },
        premium_by_type: {
          Property: 60000,
          Auto: 50000,
          Life: 30000,
          Health: 10000
        }
      });
    });

    it('should handle empty portfolio', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total_policies: 0, total_premium_usd: 0 }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const summary = await policyService.getSummary();

      expect(summary).toEqual({
        total_policies: 0,
        total_premium_usd: 0,
        count_by_status: {
          active: 0,
          expired: 0,
          cancelled: 0
        },
        premium_by_type: {
          Property: 0,
          Auto: 0,
          Life: 0,
          Health: 0
        }
      });
    });

    it('should handle partial status data', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total_policies: 50, total_premium_usd: 75000 }]
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'active', count: 50 }]
        })
        .mockResolvedValueOnce({
          rows: [{ policy_type: 'Auto', premium: 75000 }]
        });

      const summary = await policyService.getSummary();

      expect(summary.count_by_status.active).toBe(50);
      expect(summary.count_by_status.expired).toBe(0);
      expect(summary.count_by_status.cancelled).toBe(0);
      expect(summary.premium_by_type.Auto).toBe(75000);
      expect(summary.premium_by_type.Property).toBe(0);
    });
  });
});
