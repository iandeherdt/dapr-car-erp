import { randomUUID } from 'crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { customerRoutes } from './routes/customers.js';
import { workOrderRoutes } from './routes/workorders.js';
import { inventoryRoutes } from './routes/inventory.js';
import { billingRoutes } from './routes/billing.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { schemas } from './schemas.js';
import { GrpcCustomerService } from './infrastructure/grpc/GrpcCustomerService.js';
import { GrpcWorkOrderService } from './infrastructure/grpc/GrpcWorkOrderService.js';
import { GrpcInventoryService } from './infrastructure/grpc/GrpcInventoryService.js';
import { GrpcBillingService } from './infrastructure/grpc/GrpcBillingService.js';

const PORT = parseInt(process.env.BFF_PORT || '4000', 10);
const HOST = process.env.BFF_HOST || '0.0.0.0';

const server = Fastify({
  ajv: {
    customOptions: { strict: false },
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    base: { service: 'bff' },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`,
  },
});

// Decorate request with correlationId so route handlers can access it
server.decorateRequest('correlationId', '');

async function bootstrap(): Promise<void> {
  // Correlation ID: read from incoming header or generate a new UUID per request
  server.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers['x-correlation-id'];
    (request as any).correlationId = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    reply.header('x-correlation-id', (request as any).correlationId);
    request.log.info({
      action: 'request.start',
      correlationId: (request as any).correlationId,
      method: request.method,
      url: request.url,
    }, 'Incoming request');
  });

  // Log completed requests with correlationId — use warn/error for 4xx/5xx
  server.addHook('onResponse', async (request, reply) => {
    const code = reply.statusCode;
    const logFn = code >= 500 ? request.log.error.bind(request.log)
                : code >= 400 ? request.log.warn.bind(request.log)
                : request.log.info.bind(request.log);
    logFn({
      action: 'request.complete',
      correlationId: (request as any).correlationId,
      method: request.method,
      url: request.url,
      statusCode: code,
    }, 'Request completed');
  });

  // Log errors with correlationId
  server.addHook('onError', async (request, _reply, error) => {
    request.log.error({
      action: 'request.error',
      correlationId: (request as any).correlationId,
      method: request.method,
      url: request.url,
      error: { message: error.message, stack: error.stack },
    }, 'Request error');
  });

  // Register Swagger (OpenAPI 3.0)
  await server.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Car Repair ERP — BFF API',
        description:
          'REST API served by the Backend-for-Frontend. All requests are forwarded to downstream microservices via gRPC through Dapr sidecars.',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:4000', description: 'Local development' }],
      tags: [
        { name: 'Customers', description: 'Customer and vehicle management' },
        { name: 'Work Orders', description: 'Work order lifecycle and line items' },
        { name: 'Inventory', description: 'Parts catalog and stock management' },
        { name: 'Billing', description: 'Invoice management' },
        { name: 'Dashboard', description: 'Aggregated dashboard statistics' },
        { name: 'Health', description: 'Health check' },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  // Register shared schemas (referenced via $ref in route schemas)
  for (const schema of schemas) {
    server.addSchema(schema);
  }

  // Register CORS - allow all origins for dev
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  });

  // Health check
  server.get(
    '/healthz',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    },
  );

  // Instantiate service implementations
  const customerService = new GrpcCustomerService();
  const workOrderService = new GrpcWorkOrderService();
  const inventoryService = new GrpcInventoryService();
  const billingService = new GrpcBillingService();

  // Register route plugins with injected services
  await server.register(customerRoutes, { prefix: '/api', service: customerService });
  await server.register(workOrderRoutes, { prefix: '/api', workOrderService, customerService });
  await server.register(inventoryRoutes, { prefix: '/api', service: inventoryService });
  await server.register(billingRoutes, { prefix: '/api', service: billingService });
  await server.register(dashboardRoutes, { prefix: '/api', workOrderService, inventoryService, billingService });

  // Start listening
  await server.listen({ port: PORT, host: HOST });
  server.log.info(`BFF server listening on ${HOST}:${PORT}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start BFF server:', err);
  process.exit(1);
});
