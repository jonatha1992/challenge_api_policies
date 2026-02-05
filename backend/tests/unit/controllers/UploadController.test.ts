/**
 * Tests unitarios para UploadController
 * Prueba el endpoint de carga de archivos CSV
 */

import { Request, Response } from 'express';
import { UploadController } from '../../../src/controllers/UploadController';
import { ValidationService } from '../../../src/services/ValidationService';
import { PolicyService } from '../../../src/services/PolicyService';
import { OperationService } from '../../../src/services/OperationService';
import { RuleEngine } from '../../../src/rules';

// Mocks
jest.mock('../../../src/services/ValidationService');
jest.mock('../../../src/services/PolicyService');
jest.mock('../../../src/services/OperationService');
jest.mock('../../../src/rules');
jest.mock('csv-parse/sync', () => ({
  parse: jest.fn()
}));

import { parse } from 'csv-parse/sync';

describe('UploadController', () => {
  let controller: UploadController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockValidationService: jest.Mocked<ValidationService>;
  let mockPolicyService: jest.Mocked<PolicyService>;
  let mockOperationService: jest.Mocked<OperationService>;
  let mockRuleEngine: jest.Mocked<RuleEngine>;
  const mockParse = parse as jest.Mock;

  const validCsvContent = `policy_number,customer,policy_type,start_date,end_date,premium_usd,status,insured_value_usd
POL-001,John Doe,Property,2024-01-01,2024-12-31,1500,active,100000`;

  beforeEach(() => {
    jest.clearAllMocks();

    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    mockRequest = {
      correlationId: 'test-correlation-id',
      file: {
        buffer: Buffer.from(validCsvContent),
        originalname: 'policies.csv',
        mimetype: 'text/csv',
        fieldname: 'file',
        encoding: '7bit',
        size: validCsvContent.length,
        destination: '',
        filename: '',
        path: '',
        stream: null as any
      }
    };

    controller = new UploadController();

    mockValidationService = (ValidationService as jest.MockedClass<typeof ValidationService>).mock.instances[0] as jest.Mocked<ValidationService>;
    mockPolicyService = (PolicyService as jest.MockedClass<typeof PolicyService>).mock.instances[0] as jest.Mocked<PolicyService>;
    mockOperationService = (OperationService as jest.MockedClass<typeof OperationService>).mock.instances[0] as jest.Mocked<OperationService>;
    mockRuleEngine = (RuleEngine as jest.MockedClass<typeof RuleEngine>).mock.instances[0] as jest.Mocked<RuleEngine>;
  });

  describe('upload', () => {
    const mockOperation = {
      id: 'op-123',
      created_at: new Date(),
      endpoint: '/upload',
      status: 'RECEIVED' as const,
      correlation_id: 'test-correlation-id',
      rows_inserted: 0,
      rows_rejected: 0
    };

    const mockParsedRecords = [
      {
        policy_number: 'POL-001',
        customer: 'John Doe',
        policy_type: 'Property',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        premium_usd: '1500',
        status: 'active',
        insured_value_usd: '100000'
      }
    ];

    const mockPolicy = {
      policy_number: 'POL-001',
      customer: 'John Doe',
      policy_type: 'Property' as const,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      premium_usd: 1500,
      status: 'active' as const,
      insured_value_usd: 100000
    };

    it('should process valid CSV and return success', async () => {
      mockOperationService.createOperation = jest.fn().mockResolvedValue(mockOperation);
      mockOperationService.updateOperation = jest.fn().mockResolvedValue(undefined);
      mockParse.mockReturnValue(mockParsedRecords);
      mockValidationService.validateTechnical = jest.fn().mockReturnValue([]);
      mockValidationService.parseToPolicy = jest.fn().mockReturnValue(mockPolicy);
      mockRuleEngine.validate = jest.fn().mockReturnValue([]);
      mockPolicyService.insertPolicy = jest.fn().mockResolvedValue(mockPolicy);

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(mockOperationService.createOperation).toHaveBeenCalledWith('/upload', 'test-correlation-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_id: 'op-123',
          correlation_id: 'test-correlation-id',
          inserted_count: 1,
          rejected_count: 0
        })
      );
    });

    it('should return error when no file is uploaded', async () => {
      mockRequest.file = undefined;
      mockOperationService.createOperation = jest.fn().mockResolvedValue(mockOperation);
      mockOperationService.updateOperation = jest.fn().mockResolvedValue(undefined);

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('No file uploaded')
        })
      );
    });

    it('should handle CSV parse errors', async () => {
      mockOperationService.createOperation = jest.fn().mockResolvedValue(mockOperation);
      mockOperationService.updateOperation = jest.fn().mockResolvedValue(undefined);
      mockParse.mockImplementation(() => {
        throw new Error('Invalid CSV format');
      });

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Failed to parse CSV')
        })
      );
    });

    it('should reject records with technical validation errors', async () => {
      mockOperationService.createOperation = jest.fn().mockResolvedValue(mockOperation);
      mockOperationService.updateOperation = jest.fn().mockResolvedValue(undefined);
      mockParse.mockReturnValue(mockParsedRecords);
      mockValidationService.validateTechnical = jest.fn().mockReturnValue([
        { row_number: 1, field: 'policy_number', code: 'REQUIRED_FIELD', message: 'Required' }
      ]);

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          inserted_count: 0,
          rejected_count: 1,
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'REQUIRED_FIELD' })
          ])
        })
      );
    });

    it('should reject records with business rule errors', async () => {
      mockOperationService.createOperation = jest.fn().mockResolvedValue(mockOperation);
      mockOperationService.updateOperation = jest.fn().mockResolvedValue(undefined);
      mockParse.mockReturnValue(mockParsedRecords);
      mockValidationService.validateTechnical = jest.fn().mockReturnValue([]);
      mockValidationService.parseToPolicy = jest.fn().mockReturnValue(mockPolicy);
      mockRuleEngine.validate = jest.fn().mockReturnValue([
        { row_number: 1, field: 'insured_value_usd', code: 'PROPERTY_VALUE_TOO_LOW', message: 'Too low' }
      ]);

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          inserted_count: 0,
          rejected_count: 1,
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'PROPERTY_VALUE_TOO_LOW' })
          ])
        })
      );
    });

    it('should process multiple records correctly', async () => {
      const multipleRecords = [
        mockParsedRecords[0],
        { ...mockParsedRecords[0], policy_number: 'POL-002' },
        { ...mockParsedRecords[0], policy_number: 'POL-003' }
      ];

      mockOperationService.createOperation = jest.fn().mockResolvedValue(mockOperation);
      mockOperationService.updateOperation = jest.fn().mockResolvedValue(undefined);
      mockParse.mockReturnValue(multipleRecords);
      mockValidationService.validateTechnical = jest.fn().mockReturnValue([]);
      mockValidationService.parseToPolicy = jest.fn().mockReturnValue(mockPolicy);
      mockRuleEngine.validate = jest.fn().mockReturnValue([]);
      mockPolicyService.insertPolicy = jest.fn().mockResolvedValue(mockPolicy);

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(mockPolicyService.insertPolicy).toHaveBeenCalledTimes(3);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          inserted_count: 3,
          rejected_count: 0
        })
      );
    });

    it('should update operation status to COMPLETED on success', async () => {
      mockOperationService.createOperation = jest.fn().mockResolvedValue(mockOperation);
      mockOperationService.updateOperation = jest.fn().mockResolvedValue(undefined);
      mockParse.mockReturnValue(mockParsedRecords);
      mockValidationService.validateTechnical = jest.fn().mockReturnValue([]);
      mockValidationService.parseToPolicy = jest.fn().mockReturnValue(mockPolicy);
      mockRuleEngine.validate = jest.fn().mockReturnValue([]);
      mockPolicyService.insertPolicy = jest.fn().mockResolvedValue(mockPolicy);

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(mockOperationService.updateOperation).toHaveBeenCalledWith(
        'op-123',
        expect.objectContaining({
          status: 'COMPLETED',
          rows_inserted: 1
        })
      );
    });

    it('should update operation status to FAILED on error', async () => {
      mockOperationService.createOperation = jest.fn().mockResolvedValue(mockOperation);
      mockOperationService.updateOperation = jest.fn().mockResolvedValue(undefined);
      mockParse.mockImplementation(() => {
        throw new Error('Parse error');
      });

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(mockOperationService.updateOperation).toHaveBeenCalledWith(
        'op-123',
        expect.objectContaining({
          status: 'FAILED',
          error_summary: 'Failed to parse CSV: Parse error'
        })
      );
    });

    it('should track duration in operation update', async () => {
      mockOperationService.createOperation = jest.fn().mockResolvedValue(mockOperation);
      mockOperationService.updateOperation = jest.fn().mockResolvedValue(undefined);
      mockParse.mockReturnValue(mockParsedRecords);
      mockValidationService.validateTechnical = jest.fn().mockReturnValue([]);
      mockValidationService.parseToPolicy = jest.fn().mockReturnValue(mockPolicy);
      mockRuleEngine.validate = jest.fn().mockReturnValue([]);
      mockPolicyService.insertPolicy = jest.fn().mockResolvedValue(mockPolicy);

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(mockOperationService.updateOperation).toHaveBeenCalledWith(
        'op-123',
        expect.objectContaining({
          duration_ms: expect.any(Number)
        })
      );
    });
  });
});

