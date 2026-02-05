/**
 * Tests unitarios para PolicyController
 * Prueba los endpoints de consulta de polizas
 */

import { Request, Response } from 'express';
import { PolicyController } from '../../../src/controllers/PolicyController';
import { PolicyService } from '../../../src/services/PolicyService';

// Mock del PolicyService
jest.mock('../../../src/services/PolicyService');

describe('PolicyController', () => {
  let controller: PolicyController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockPolicyService: jest.Mocked<PolicyService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock response
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    // Setup mock request
    mockRequest = {
      query: {},
      correlationId: 'test-correlation-id'
    };

    // Create controller instance
    controller = new PolicyController();

    // Get mock instance
    mockPolicyService = (PolicyService as jest.MockedClass<typeof PolicyService>).mock.instances[0] as jest.Mocked<PolicyService>;
  });

  describe('list', () => {
    const mockPoliciesResult = {
      items: [
        {
          id: 1,
          policy_number: 'POL-001',
          customer: 'John Doe',
          policy_type: 'Property',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-12-31'),
          premium_usd: 1500,
          status: 'active',
          insured_value_usd: 100000
        }
      ],
      pagination: {
        limit: 25,
        offset: 0,
        total: 1
      }
    };

    it('should return policies with default pagination', async () => {
      mockPolicyService.findAll = jest.fn().mockResolvedValue(mockPoliciesResult);

      await controller.list(mockRequest as Request, mockResponse as Response);

      expect(mockPolicyService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 25,
          offset: 0
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockPoliciesResult);
    });

    it('should pass query parameters as filters', async () => {
      mockRequest.query = {
        status: 'active',
        policy_type: 'Property',
        q: 'John',
        limit: '50',
        offset: '10'
      };
      mockPolicyService.findAll = jest.fn().mockResolvedValue(mockPoliciesResult);

      await controller.list(mockRequest as Request, mockResponse as Response);

      expect(mockPolicyService.findAll).toHaveBeenCalledWith({
        status: 'active',
        policy_type: 'Property',
        q: 'John',
        limit: 50,
        offset: 10
      });
    });

    it('should handle undefined query parameters', async () => {
      mockRequest.query = {};
      mockPolicyService.findAll = jest.fn().mockResolvedValue(mockPoliciesResult);

      await controller.list(mockRequest as Request, mockResponse as Response);

      expect(mockPolicyService.findAll).toHaveBeenCalledWith({
        status: undefined,
        policy_type: undefined,
        q: undefined,
        limit: 25,
        offset: 0
      });
    });

    it('should return 500 on service error', async () => {
      mockPolicyService.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

      await controller.list(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Database error'
      });
    });

    it('should handle unknown error types', async () => {
      mockPolicyService.findAll = jest.fn().mockRejectedValue('Unknown error');

      await controller.list(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unknown error'
      });
    });
  });

  describe('summary', () => {
    const mockSummary = {
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
    };

    it('should return portfolio summary', async () => {
      mockPolicyService.getSummary = jest.fn().mockResolvedValue(mockSummary);

      await controller.summary(mockRequest as Request, mockResponse as Response);

      expect(mockPolicyService.getSummary).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockSummary);
    });

    it('should return 500 on service error', async () => {
      mockPolicyService.getSummary = jest.fn().mockRejectedValue(new Error('Connection timeout'));

      await controller.summary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Connection timeout'
      });
    });

    it('should handle empty portfolio', async () => {
      const emptySummary = {
        total_policies: 0,
        total_premium_usd: 0,
        count_by_status: { active: 0, expired: 0, cancelled: 0 },
        premium_by_type: { Property: 0, Auto: 0, Life: 0, Health: 0 }
      };
      mockPolicyService.getSummary = jest.fn().mockResolvedValue(emptySummary);

      await controller.summary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(emptySummary);
    });
  });
});

