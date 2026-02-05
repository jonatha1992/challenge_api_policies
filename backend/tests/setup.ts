/**
 * Jest Test Setup File
 * Este archivo se ejecuta antes de cada suite de tests.
 * Configura el entorno de pruebas y los mocks globales.
 */

// Configurar variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

// Mock del logger para evitar output en tests
jest.mock('../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// Timeout global para tests async
jest.setTimeout(30000);

// Limpiar mocks despues de cada test
afterEach(() => {
  jest.clearAllMocks();
});

// Cerrar conexiones despues de todos los tests
afterAll(async () => {
  // Cleanup global si es necesario
});

