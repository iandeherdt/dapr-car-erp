import { randomUUID } from 'crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { customerRoutes } from './routes/customers.js';
import { workOrderRoutes } from './routes/workorders.js';
import { inventoryRoutes } from './routes/inventory.js';
import { billingRoutes } from './routes/billing.js';
import { dashboardRoutes } from './routes/dashboard.js';

const PORT = parseInt(process.env.BFF_PORT || '4000', 10);
const HOST = process.env.BFF_HOST || '0.0.0.0';

const server = Fastify({
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

  // Register CORS - allow all origins for dev
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  });

  // Health check
  server.get('/healthz', async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register route plugins
  await server.register(customerRoutes, { prefix: '/api' });
  await server.register(workOrderRoutes, { prefix: '/api' });
  await server.register(inventoryRoutes, { prefix: '/api' });
  await server.register(billingRoutes, { prefix: '/api' });
  await server.register(dashboardRoutes, { prefix: '/api' });

  // Start listening
  await server.listen({ port: PORT, host: HOST });
  server.log.info(`BFF server listening on ${HOST}:${PORT}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start BFF server:', err);
  process.exit(1);
});
