import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SMART Scheduling Links API',
      version: '1.0.0',
      description: `
FHIR R4 compliant scheduling API implementing SMART Scheduling Links IG.

**HL7 FHIR Connectathon 41 - Patient Scheduling Track**

This API supports:
- 🔍 Slot discovery and search
- 📅 Provider availability queries
- 🏥 Multi-publisher data aggregation
- 🔗 SMART scheduling deep-links
- 📊 Bulk data publishing (FHIR $bulk-publish)

## Roles
- **Client**: Consumes appointment slots from external publishers
- **Slot Directory**: Aggregates and republishes slot data

## Authentication
Currently no authentication required (open API for Connectathon).

## FHIR Resources
- Location
- PractitionerRole
- Schedule
- Slot
      `,
      contact: {
        name: 'GitHub Repository',
        url: 'https://github.com/aks129/smartscheduling'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://smartscheduling.vercel.app',
        description: 'Production server (Vercel)'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check and server status'
      },
      {
        name: 'FHIR Resources',
        description: 'FHIR R4 resource endpoints (Location, PractitionerRole, Schedule, Slot)'
      },
      {
        name: 'Search & Discovery',
        description: 'Provider and slot search with advanced filtering'
      },
      {
        name: 'Booking',
        description: 'Appointment booking information and deep-links'
      },
      {
        name: 'Bulk Publish',
        description: 'FHIR $bulk-publish operation (Slot Directory role)'
      },
      {
        name: 'Admin',
        description: 'Administrative operations (sync, status)'
      }
    ],
    components: {
      schemas: {
        Location: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'loc-1' },
            name: { type: 'string', example: 'Main Street Clinic' },
            telecom: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  system: { type: 'string', example: 'phone' },
                  value: { type: 'string', example: '(555) 123-4567' }
                }
              }
            },
            address: {
              type: 'object',
              properties: {
                line: { type: 'array', items: { type: 'string' } },
                city: { type: 'string', example: 'Boston' },
                state: { type: 'string', example: 'MA' },
                postalCode: { type: 'string', example: '02101' }
              }
            },
            position: {
              type: 'object',
              properties: {
                latitude: { type: 'number', example: 42.3601 },
                longitude: { type: 'number', example: -71.0589 }
              }
            },
            publisherUrl: { type: 'string', example: 'https://publisher.example.com' }
          }
        },
        PractitionerRole: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'pr-1' },
            practitioner: {
              type: 'object',
              properties: {
                reference: { type: 'string', example: 'Practitioner/123' },
                display: { type: 'string', example: 'Dr. Jane Smith' }
              }
            },
            specialty: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  coding: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        system: { type: 'string' },
                        code: { type: 'string', example: 'dermatology' },
                        display: { type: 'string', example: 'Dermatology' }
                      }
                    }
                  }
                }
              }
            },
            location: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  reference: { type: 'string', example: 'Location/loc-1' }
                }
              }
            },
            npi: { type: 'string', example: '1234567890' },
            insuranceAccepted: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', example: 'Medicare' },
                  accepted: { type: 'boolean', example: true }
                }
              }
            },
            languagesSpoken: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  language: { type: 'string', example: 'English' },
                  code: { type: 'string', example: 'en' }
                }
              }
            }
          }
        },
        Slot: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'slot-1' },
            schedule: {
              type: 'object',
              properties: {
                reference: { type: 'string', example: 'Schedule/sch-1' }
              }
            },
            status: {
              type: 'string',
              enum: ['free', 'busy', 'busy-unavailable', 'busy-tentative'],
              example: 'free'
            },
            start: { type: 'string', format: 'date-time', example: '2024-01-15T09:00:00Z' },
            end: { type: 'string', format: 'date-time', example: '2024-01-15T09:30:00Z' },
            appointmentType: { type: 'string', example: 'routine' },
            isVirtual: { type: 'boolean', example: false },
            extension: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  valueUrl: { type: 'string' },
                  valueString: { type: 'string' }
                }
              }
            }
          }
        },
        SearchFilters: {
          type: 'object',
          properties: {
            searchQuery: { type: 'string', example: 'Smith' },
            specialty: { type: 'string', example: 'dermatology' },
            location: { type: 'string', example: 'Boston' },
            dateFrom: { type: 'string', format: 'date', example: '2024-01-15' },
            dateTo: { type: 'string', format: 'date', example: '2024-02-15' },
            availableOnly: { type: 'boolean', example: true },
            languages: {
              type: 'array',
              items: { type: 'string' },
              example: ['english', 'spanish']
            },
            insurance: {
              type: 'array',
              items: { type: 'string' },
              example: ['medicare', 'medicaid']
            },
            appointmentType: { type: 'string', example: 'routine' }
          }
        },
        BulkPublishManifest: {
          type: 'object',
          properties: {
            operationDefinition: {
              type: 'string',
              example: 'http://hl7.org/fhir/uv/bulkdata/OperationDefinition/bulk-publish|1.0.0'
            },
            transactionTime: { type: 'string', format: 'date-time' },
            request: { type: 'string', example: 'GET /fhir/$bulk-publish' },
            requiresAccessToken: { type: 'boolean', example: false },
            outputFormat: { type: 'string', example: 'application/fhir+ndjson' },
            output: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', example: 'Slot' },
                  url: { type: 'string', example: 'https://example.com/fhir/data/slots.ndjson' },
                  count: { type: 'number', example: 150 },
                  extension: {
                    type: 'object',
                    properties: {
                      state: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['FL', 'MA', 'NY'],
                        description: 'US states covered by the slots in this resource'
                      }
                    }
                  }
                }
              }
            },
            error: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    }
  },
  apis: ['./server/routes.ts', './server/swagger.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
