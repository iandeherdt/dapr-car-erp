import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { GrpcClientError } from '../clients/grpc-client.js';
import type { IBillingService } from '../application/services/IBillingService.js';
import type { InvoiceStatus } from '../clients/billing-client.js';

export interface BillingRouteOptions extends FastifyPluginOptions {
  service: IBillingService;
}

function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof GrpcClientError) {
    return reply.status(err.httpStatus).send({ error: err.message, code: err.grpcCode });
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return reply.status(500).send({ error: message });
}

const idParam = {
  type: 'object',
  properties: { id: { type: 'string', format: 'uuid' } },
  required: ['id'],
};

const paginationQuery = {
  page: { type: 'string', description: 'Page number (1-based)', default: '1' },
  pageSize: { type: 'string', description: 'Records per page', default: '20' },
};

const errorResponses = {
  400: { $ref: 'ApiError#' },
  404: { $ref: 'ApiError#' },
  500: { $ref: 'ApiError#' },
};

export async function billingRoutes(fastify: FastifyInstance, opts: BillingRouteOptions): Promise<void> {
  const { service } = opts;

  // GET /api/invoices
  fastify.get(
    '/invoices',
    {
      schema: {
        tags: ['Billing'],
        summary: 'List invoices',
        description: 'Returns a paginated list of invoices with an optional status filter.',
        querystring: {
          type: 'object',
          properties: {
            ...paginationQuery,
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
              description: 'Filter by invoice status',
            },
          },
        },
        response: {
          200: { $ref: 'ListInvoicesResponse#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: string;
          pageSize?: string;
          status?: InvoiceStatus;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const page = parseInt(request.query.page ?? '1', 10);
        const pageSize = parseInt(request.query.pageSize ?? '20', 10);
        const { status } = request.query;
        const correlationId = (request as any).correlationId;

        const result = await service.listInvoices({ page, pageSize }, status, correlationId);
        return reply.send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/invoices/:id
  fastify.get(
    '/invoices/:id',
    {
      schema: {
        tags: ['Billing'],
        summary: 'Get invoice by ID',
        params: idParam,
        response: {
          200: { $ref: 'Invoice#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const invoice = await service.getInvoice(request.params.id, correlationId);
        return reply.send(invoice);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // PUT /api/invoices/:id/status
  fastify.put(
    '/invoices/:id/status',
    {
      schema: {
        tags: ['Billing'],
        summary: 'Update invoice status',
        params: idParam,
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
            },
          },
        },
        response: {
          200: { $ref: 'Invoice#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { status: InvoiceStatus };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const invoice = await service.updateInvoiceStatus({
          id: request.params.id,
          newStatus: request.body.status,
        }, correlationId);
        return reply.send(invoice);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/customers/:id/invoices
  fastify.get(
    '/customers/:id/invoices',
    {
      schema: {
        tags: ['Billing'],
        summary: 'List invoices for a customer',
        params: idParam,
        querystring: {
          type: 'object',
          properties: { ...paginationQuery },
        },
        response: {
          200: { $ref: 'ListInvoicesResponse#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { page?: string; pageSize?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const page = parseInt(request.query.page ?? '1', 10);
        const pageSize = parseInt(request.query.pageSize ?? '20', 10);
        const correlationId = (request as any).correlationId;

        const result = await service.getInvoicesByCustomer(request.params.id, {
          page,
          pageSize,
        }, correlationId);
        return reply.send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );
}
