/**
 * Tests unitarios para AIController
 * Prueba el endpoint de generacion de insights con IA
 */

import { Request, Response } from 'express';
import { AIController } from '../../../src/controllers/AIController';
import { PolicyService } from '../../../src/services/PolicyService';
import { AIInsightsService } from '../../../src/services/AIInsightsService';

// Mock de los servicios
jest.mock('../../../src/services/PolicyService');
jest.mock('../../../src/services/AIInsightsService');

describe('AIController', () => {
  let controller: AIController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockPolicyService: jest.Mocked<PolicyService>;
  let mockAIService: jest.Mocked<AIInsightsService>;

  const mockPolicies = [
    {
      id: 1,
      policy_number: 'POL-001',
      customer: 'John Doe',
      policy_type: 'Property' as const,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      premium_usd: 1500,
      status: 'active' as const,
      insured_value_usd: 100000
    }
  ];

  const mockSummary = {
    total_policies: 10,
    total_premium_usd: 15000,
    count_by_status: { active: 7, expired: 2, cancelled: 1 },
    premium_by_type: { Property: 6000, Auto: 5000, Life: 3000, Health: 1000 }
  };

  const mockInsights = {
    insights: ['Portfolio is healthy', 'Consider diversification'],
    highlights: {
      total_policies: 10,
      risk_flags: 1,
      recommendations_count: 1
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    mockRequest = {
      body: {},
      correlationId: 'test-correlation-id'
    };

    controller = new AIController();

    mockPolicyService = (PolicyService as jest.MockedClass<typeof PolicyService>).mock.instances[0] as jest.Mocked<PolicyService>;
    mockAIService = (AIInsightsService as jest.MockedClass<typeof AIInsightsService>).mock.instances[0] as jest.Mocked<AIInsightsService>;
  });

  describe('generateInsights', () => {
    it('should generate insights with default filters', async () => {
      mockPolicyService.findAll = jest.fn().mockResolvedValue({
        items: mockPolicies,
        pagination: { limit: 100, offset: 0, total: 1 }
      });
      mockPolicyService.getSummary = jest.fn().mockResolvedValue(mockSummary);
      mockAIService.generateInsights = jest.fn().mockResolvedValue(mockInsights);

      await controller.generateInsights(mockRequest as Request, mockResponse as Response);

      expect(mockPolicyService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100
        })
      );
      expect(mockPolicyService.getSummary).toHaveBeenCalled();
      expect(mockAIService.generateInsights).toHaveBeenCalledWith(
        mockPolicies,
        mockSummary,
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockInsights);
    });

    it('should pass filters from request body', async () => {
      mockRequest.body = {
        filters: {
          status: 'active',
          policy_type: 'Property',
          q: 'John'
        }
      };
      mockPolicyService.findAll = jest.fn().mockResolvedValue({
        items: mockPolicies,
        pagination: { limit: 100, offset: 0, total: 1 }
      });
      mockPolicyService.getSummary = jest.fn().mockResolvedValue(mockSummary);
      mockAIService.generateInsights = jest.fn().mockResolvedValue(mockInsights);

      await controller.generateInsights(mockRequest as Request, mockResponse as Response);

      expect(mockPolicyService.findAll).toHaveBeenCalledWith({
        status: 'active',
        policy_type: 'Property',
        q: 'John',
        limit: 100
      });
    });

    it('should handle empty filters object', async () => {
      mockRequest.body = { filters: {} };
      mockPolicyService.findAll = jest.fn().mockResolvedValue({
        items: [],
        pagination: { limit: 100, offset: 0, total: 0 }
      });
      mockPolicyService.getSummary = jest.fn().mockResolvedValue({
        total_policies: 0,
        total_premium_usd: 0,
        count_by_status: { active: 0, expired: 0, cancelled: 0 },
        premium_by_type: { Property: 0, Auto: 0, Life: 0, Health: 0 }
      });
      mockAIService.generateInsights = jest.fn().mockResolvedValue({
        insights: [],
        highlights: { total_policies: 0, risk_flags: 0, recommendations_count: 0 }
      });

      await controller.generateInsights(mockRequest as Request, mockResponse as Response);

      expect(mockPolicyService.findAll).toHaveBeenCalledWith({
        status: undefined,
        policy_type: undefined,
        q: undefined,
        limit: 100
      });
    });

    it('should return 500 on PolicyService error', async () => {
      mockPolicyService.findAll = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await controller.generateInsights(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Database connection failed'
      });
    });

    it('should return 500 on AIInsightsService error', async () => {
      mockPolicyService.findAll = jest.fn().mockResolvedValue({
        items: mockPolicies,
        pagination: { limit: 100, offset: 0, total: 1 }
      });
      mockPolicyService.getSummary = jest.fn().mockResolvedValue(mockSummary);
      mockAIService.generateInsights = jest.fn().mockRejectedValue(new Error('AI service unavailable'));

      await controller.generateInsights(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'AI service unavailable'
      });
    });

    it('should handle unknown error types', async () => {
      mockPolicyService.findAll = jest.fn().mockRejectedValue('String error');

      await controller.generateInsights(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unknown error'
      });
    });

    it('should limit analysis to 100 policies', async () => {
      mockPolicyService.findAll = jest.fn().mockResolvedValue({
        items: mockPolicies,
        pagination: { limit: 100, offset: 0, total: 500 }
      });
      mockPolicyService.getSummary = jest.fn().mockResolvedValue(mockSummary);
      mockAIService.generateInsights = jest.fn().mockResolvedValue(mockInsights);

      await controller.generateInsights(mockRequest as Request, mockResponse as Response);

      expect(mockPolicyService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100
        })
      );
    });
  });
});
