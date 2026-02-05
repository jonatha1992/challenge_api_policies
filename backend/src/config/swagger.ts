/**
 * Configuracion de Swagger/OpenAPI para documentacion de la API
 * Define la especificacion OpenAPI 3.0 para todos los endpoints del sistema
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// Definicion de la especificacion OpenAPI
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Insurance Policy Management API',
    version: '1.0.0',
    description: `
## API de Gestion de Polizas de Seguros

Esta API permite gestionar un portfolio de polizas de seguros con las siguientes funcionalidades:

- **Carga masiva de polizas** via archivos CSV
- **Consulta y busqueda** de polizas con filtros y paginacion
- **Estadisticas y resumen** del portfolio
- **Insights con IA** sobre el estado del portfolio

### Caracteristicas

- Validaciones tecnicas y de negocio
- Motor de reglas extensible para validaciones de negocio
- Trazabilidad completa de operaciones
- Soporte para multiples tipos de polizas

### Tipos de Polizas Soportados

| Tipo | Valor Minimo Asegurado |
|------|------------------------|
| Property | $5,000 USD |
| Auto | $10,000 USD |
| Life | Sin minimo |
| Health | Sin minimo |
    `,
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor de desarrollo local'
    },
    {
      url: 'https://api.example.com',
      description: 'Servidor de produccion'
    }
  ],
  tags: [
    {
      name: 'Upload',
      description: 'Endpoints para carga masiva de polizas'
    },
    {
      name: 'Policies',
      description: 'Endpoints para consulta de polizas'
    },
    {
      name: 'AI Insights',
      description: 'Endpoints para analisis con inteligencia artificial'
    },
    {
      name: 'Health',
      description: 'Endpoints de monitoreo y estado'
    }
  ],
  components: {
    schemas: {
      // Esquema de Poliza
      Policy: {
        type: 'object',
        required: ['policy_number', 'customer', 'policy_type', 'start_date', 'end_date', 'premium_usd', 'status', 'insured_value_usd'],
        properties: {
          id: {
            type: 'integer',
            description: 'ID unico de la poliza en la base de datos',
            example: 1
          },
          policy_number: {
            type: 'string',
            description: 'Numero unico de la poliza',
            example: 'POL-2024-001'
          },
          customer: {
            type: 'string',
            description: 'Nombre del cliente asegurado',
            example: 'John Doe'
          },
          policy_type: {
            type: 'string',
            enum: ['Property', 'Auto', 'Life', 'Health'],
            description: 'Tipo de poliza de seguro',
            example: 'Property'
          },
          start_date: {
            type: 'string',
            format: 'date',
            description: 'Fecha de inicio de cobertura',
            example: '2024-01-01'
          },
          end_date: {
            type: 'string',
            format: 'date',
            description: 'Fecha de fin de cobertura',
            example: '2024-12-31'
          },
          premium_usd: {
            type: 'number',
            format: 'float',
            description: 'Prima mensual en dolares estadounidenses',
            example: 1500.00
          },
          status: {
            type: 'string',
            enum: ['active', 'expired', 'cancelled'],
            description: 'Estado actual de la poliza',
            example: 'active'
          },
          insured_value_usd: {
            type: 'number',
            format: 'float',
            description: 'Valor total asegurado en dolares estadounidenses',
            example: 100000.00
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de creacion del registro',
            example: '2024-01-15T10:30:00Z'
          }
        }
      },

      // Esquema de entrada de Poliza (CSV)
      PolicyInput: {
        type: 'object',
        properties: {
          policy_number: {
            type: 'string',
            description: 'Numero unico de la poliza'
          },
          customer: {
            type: 'string',
            description: 'Nombre del cliente'
          },
          policy_type: {
            type: 'string',
            description: 'Tipo de poliza (Property, Auto, Life, Health)'
          },
          start_date: {
            type: 'string',
            description: 'Fecha de inicio (formato YYYY-MM-DD)'
          },
          end_date: {
            type: 'string',
            description: 'Fecha de fin (formato YYYY-MM-DD)'
          },
          premium_usd: {
            type: 'string',
            description: 'Prima mensual (puede ser string o numero)'
          },
          status: {
            type: 'string',
            description: 'Estado (active, expired, cancelled)'
          },
          insured_value_usd: {
            type: 'string',
            description: 'Valor asegurado (puede ser string o numero)'
          }
        }
      },

      // Error de validacion
      ValidationError: {
        type: 'object',
        properties: {
          row_number: {
            type: 'integer',
            description: 'Numero de fila en el CSV donde ocurrio el error',
            example: 5
          },
          field: {
            type: 'string',
            description: 'Campo que fallo la validacion',
            example: 'insured_value_usd'
          },
          code: {
            type: 'string',
            description: 'Codigo unico del tipo de error',
            example: 'PROPERTY_VALUE_TOO_LOW'
          },
          message: {
            type: 'string',
            description: 'Mensaje descriptivo del error',
            example: 'Property policies must have insured value >= $5,000'
          }
        }
      },

      // Resultado de carga
      UploadResult: {
        type: 'object',
        properties: {
          operation_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID unico de la operacion de carga',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          correlation_id: {
            type: 'string',
            description: 'ID de correlacion para trazabilidad',
            example: 'corr-123456'
          },
          inserted_count: {
            type: 'integer',
            description: 'Numero de polizas insertadas exitosamente',
            example: 95
          },
          rejected_count: {
            type: 'integer',
            description: 'Numero de polizas rechazadas por errores',
            example: 5
          },
          errors: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ValidationError'
            },
            description: 'Lista detallada de errores encontrados'
          }
        }
      },

      // Respuesta paginada
      PaginatedPolicies: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Policy'
            },
            description: 'Lista de polizas de la pagina actual'
          },
          pagination: {
            type: 'object',
            properties: {
              limit: {
                type: 'integer',
                description: 'Numero maximo de elementos por pagina',
                example: 25
              },
              offset: {
                type: 'integer',
                description: 'Desplazamiento desde el inicio',
                example: 0
              },
              total: {
                type: 'integer',
                description: 'Total de elementos disponibles',
                example: 150
              }
            }
          }
        }
      },

      // Resumen del portfolio
      PolicySummary: {
        type: 'object',
        properties: {
          total_policies: {
            type: 'integer',
            description: 'Total de polizas en el sistema',
            example: 150
          },
          total_premium_usd: {
            type: 'number',
            format: 'float',
            description: 'Suma total de primas en dolares',
            example: 225000.00
          },
          count_by_status: {
            type: 'object',
            description: 'Conteo de polizas por estado',
            properties: {
              active: { type: 'integer', example: 100 },
              expired: { type: 'integer', example: 35 },
              cancelled: { type: 'integer', example: 15 }
            }
          },
          premium_by_type: {
            type: 'object',
            description: 'Suma de primas por tipo de poliza',
            properties: {
              Property: { type: 'number', example: 80000 },
              Auto: { type: 'number', example: 60000 },
              Life: { type: 'number', example: 50000 },
              Health: { type: 'number', example: 35000 }
            }
          }
        }
      },

      // Respuesta de insights
      InsightsResponse: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Lista de observaciones y recomendaciones',
            example: [
              'Alta concentracion en polizas Property: 65% del premium total. Considere diversificar.',
              'Recomendacion: mantener monitoreo continuo del ratio loss/premium.'
            ]
          },
          highlights: {
            type: 'object',
            properties: {
              total_policies: {
                type: 'integer',
                description: 'Total de polizas analizadas',
                example: 150
              },
              risk_flags: {
                type: 'integer',
                description: 'Numero de indicadores de riesgo encontrados',
                example: 2
              },
              recommendations_count: {
                type: 'integer',
                description: 'Numero de recomendaciones generadas',
                example: 3
              }
            }
          }
        }
      },

      // Estado de salud
      HealthStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['ok', 'degraded', 'error'],
            description: 'Estado del servicio',
            example: 'ok'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp del chequeo',
            example: '2024-01-15T10:30:00Z'
          }
        }
      },

      // Error generico
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Mensaje de error',
            example: 'Internal server error'
          },
          correlation_id: {
            type: 'string',
            description: 'ID de correlacion para depuracion',
            example: 'corr-123456'
          }
        }
      }
    },

    // Parametros reutilizables
    parameters: {
      status: {
        name: 'status',
        in: 'query',
        description: 'Filtrar por estado de la poliza',
        required: false,
        schema: {
          type: 'string',
          enum: ['active', 'expired', 'cancelled']
        }
      },
      policy_type: {
        name: 'policy_type',
        in: 'query',
        description: 'Filtrar por tipo de poliza',
        required: false,
        schema: {
          type: 'string',
          enum: ['Property', 'Auto', 'Life', 'Health']
        }
      },
      q: {
        name: 'q',
        in: 'query',
        description: 'Busqueda por texto en numero de poliza o nombre de cliente',
        required: false,
        schema: {
          type: 'string'
        }
      },
      limit: {
        name: 'limit',
        in: 'query',
        description: 'Numero maximo de resultados por pagina (max 100)',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 25
        }
      },
      offset: {
        name: 'offset',
        in: 'query',
        description: 'Desplazamiento para paginacion',
        required: false,
        schema: {
          type: 'integer',
          minimum: 0,
          default: 0
        }
      }
    }
  },

  // Definicion de paths/endpoints
  paths: {
    '/upload': {
      post: {
        tags: ['Upload'],
        summary: 'Cargar archivo CSV de polizas',
        description: `
Procesa un archivo CSV con polizas de seguros y las inserta en la base de datos.

### Formato del CSV
El archivo debe contener las siguientes columnas:
- policy_number (requerido)
- customer (requerido)
- policy_type (Property, Auto, Life, Health)
- start_date (formato YYYY-MM-DD)
- end_date (formato YYYY-MM-DD)
- premium_usd (numero positivo)
- status (active, expired, cancelled)
- insured_value_usd (numero positivo)

### Validaciones
1. **Validaciones Tecnicas**: formato, campos requeridos, tipos de datos
2. **Validaciones de Negocio**:
   - Property: valor asegurado >= $5,000
   - Auto: valor asegurado >= $10,000

### Comportamiento
- Las polizas con el mismo policy_number se actualizan (upsert)
- Se procesan todas las filas y se reportan todos los errores
- La operacion es atomica por fila (cada poliza valida se inserta)
        `,
        operationId: 'uploadPolicies',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Archivo CSV con las polizas'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Todas las filas procesadas exitosamente (sin rechazos)',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UploadResult'
                },
                example: {
                  operation_id: '550e8400-e29b-41d4-a716-446655440000',
                  correlation_id: 'corr-123456',
                  inserted_count: 100,
                  updated_count: 0,
                  rejected_count: 0,
                  errors: [],
                  updated_policies: []
                }
              }
            }
          },
          '207': {
            description: 'Procesamiento parcial - Algunas filas procesadas, otras rechazadas',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UploadResult'
                },
                example: {
                  operation_id: '550e8400-e29b-41d4-a716-446655440000',
                  correlation_id: 'corr-123456',
                  inserted_count: 95,
                  updated_count: 0,
                  rejected_count: 5,
                  errors: [
                    {
                      row_number: 3,
                      field: 'insured_value_usd',
                      code: 'PROPERTY_VALUE_TOO_LOW',
                      message: 'Property policies must have insured value >= $5,000'
                    }
                  ],
                  updated_policies: []
                }
              }
            }
          },
          '422': {
            description: 'Todas las filas rechazadas por errores de validación',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UploadResult'
                },
                example: {
                  operation_id: '550e8400-e29b-41d4-a716-446655440000',
                  correlation_id: 'corr-123456',
                  inserted_count: 0,
                  updated_count: 0,
                  rejected_count: 10,
                  errors: [
                    {
                      row_number: 1,
                      field: 'insured_value_usd',
                      code: 'PROPERTY_VALUE_TOO_LOW',
                      message: 'Property policies must have insured value >= $5,000'
                    }
                  ],
                  updated_policies: []
                }
              }
            }
          },
          '500': {
            description: 'Error del servidor',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },

    '/policies': {
      get: {
        tags: ['Policies'],
        summary: 'Listar polizas con filtros',
        description: 'Obtiene una lista paginada de polizas con filtros opcionales.',
        operationId: 'listPolicies',
        parameters: [
          { $ref: '#/components/parameters/status' },
          { $ref: '#/components/parameters/policy_type' },
          { $ref: '#/components/parameters/q' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' }
        ],
        responses: {
          '200': {
            description: 'Lista de polizas',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaginatedPolicies'
                },
                example: {
                  items: [
                    {
                      id: 1,
                      policy_number: 'POL-2024-001',
                      customer: 'John Doe',
                      policy_type: 'Property',
                      start_date: '2024-01-01',
                      end_date: '2024-12-31',
                      premium_usd: 1500.00,
                      status: 'active',
                      insured_value_usd: 100000.00,
                      created_at: '2024-01-15T10:30:00Z'
                    }
                  ],
                  pagination: {
                    limit: 25,
                    offset: 0,
                    total: 150
                  }
                }
              }
            }
          },
          '500': {
            description: 'Error del servidor',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },

    '/policies/summary': {
      get: {
        tags: ['Policies'],
        summary: 'Obtener resumen del portfolio',
        description: 'Obtiene estadisticas agregadas del portfolio completo de polizas.',
        operationId: 'getPolicySummary',
        responses: {
          '200': {
            description: 'Resumen del portfolio',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PolicySummary'
                },
                example: {
                  total_policies: 150,
                  total_premium_usd: 225000.00,
                  count_by_status: {
                    active: 100,
                    expired: 35,
                    cancelled: 15
                  },
                  premium_by_type: {
                    Property: 80000,
                    Auto: 60000,
                    Life: 50000,
                    Health: 35000
                  }
                }
              }
            }
          },
          '500': {
            description: 'Error del servidor',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },

    '/ai/insights': {
      post: {
        tags: ['AI Insights'],
        summary: 'Generar insights con IA',
        description: `
Genera insights y recomendaciones sobre el portfolio de polizas.

### Funcionamiento
- Si hay API key de Gemini configurada, usa analisis con IA
- Si no hay API key, usa analisis local basado en reglas

### Tipos de Analisis
1. **Concentracion por tipo**: detecta si un tipo de poliza domina el portfolio
2. **Valores minimos**: identifica polizas cercanas al valor minimo requerido
3. **Distribucion de estados**: analiza ratio de polizas expiradas/canceladas
        `,
        operationId: 'generateInsights',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  filters: {
                    type: 'object',
                    description: 'Filtros opcionales para analizar un subconjunto de polizas',
                    properties: {
                      status: {
                        type: 'string',
                        enum: ['active', 'expired', 'cancelled']
                      },
                      policy_type: {
                        type: 'string',
                        enum: ['Property', 'Auto', 'Life', 'Health']
                      },
                      q: {
                        type: 'string',
                        description: 'Busqueda por texto'
                      }
                    }
                  }
                }
              },
              example: {
                filters: {
                  status: 'active',
                  policy_type: 'Property'
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Insights generados',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/InsightsResponse'
                },
                example: {
                  insights: [
                    'Alta concentracion en polizas Property: 65% del premium total. Considere diversificar el portafolio.',
                    '3 poliza(s) Property con valor asegurado cercano al minimo ($5,000). Recomendacion: implementar alertas.',
                    'Recomendacion general: mantener monitoreo continuo del ratio loss/premium.'
                  ],
                  highlights: {
                    total_policies: 150,
                    risk_flags: 2,
                    recommendations_count: 3
                  }
                }
              }
            }
          },
          '500': {
            description: 'Error del servidor',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },

    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Verifica el estado del servicio. Usado por load balancers y monitoreo.',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Servicio funcionando correctamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthStatus'
                },
                example: {
                  status: 'ok',
                  timestamp: '2024-01-15T10:30:00Z'
                }
              }
            }
          }
        }
      }
    }
  }
};

// Opciones de swagger-jsdoc
const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [] // No usamos anotaciones en el codigo, todo esta definido arriba
};

// Generar especificacion
const swaggerSpec = swaggerJsdoc(options);

/**
 * Configura Swagger UI en la aplicacion Express
 * @param app - Instancia de Express
 */
export const setupSwagger = (app: Express): void => {
  // Servir la documentacion de Swagger UI en /api
  app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Insurance Policy API - Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }));

  // Endpoint para obtener la especificacion OpenAPI en JSON
  app.get('/api.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export { swaggerSpec };
