import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { GrpcClientError } from '../clients/grpc-client.js';
import type { IInventoryService } from '../application/services/IInventoryService.js';
import type { CreatePartRequest, UpdatePartRequest } from '../clients/inventory-client.js';

export interface InventoryRouteOptions extends FastifyPluginOptions {
  service: IInventoryService;
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

export async function inventoryRoutes(fastify: FastifyInstance, opts: InventoryRouteOptions): Promise<void> {
  const { service } = opts;

  // GET /api/parts/low-stock  — must be registered BEFORE /api/parts/:id to avoid param clash
  fastify.get(
    '/parts/low-stock',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'List low-stock parts',
        description: 'Returns parts whose quantity in stock is at or below their reorder level.',
        querystring: {
          type: 'object',
          properties: { ...paginationQuery },
        },
        response: {
          200: { $ref: 'ListPartsResponse#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { page?: string; pageSize?: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const page = parseInt(request.query.page ?? '1', 10);
        const pageSize = parseInt(request.query.pageSize ?? '20', 10);
        const correlationId = (request as any).correlationId;

        const result = await service.listLowStockParts({ page, pageSize }, correlationId);
        return reply.send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/parts
  fastify.get(
    '/parts',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'List parts',
        description: 'Returns a paginated parts catalog with optional category and text search filters.',
        querystring: {
          type: 'object',
          properties: {
            ...paginationQuery,
            category: { type: 'string', description: 'Filter by category (exact match)', example: 'Filters' },
            search: { type: 'string', description: 'Full-text search across name, SKU, description' },
          },
        },
        response: {
          200: { $ref: 'ListPartsResponse#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { page?: string; pageSize?: string; category?: string; search?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const page = parseInt(request.query.page ?? '1', 10);
        const pageSize = parseInt(request.query.pageSize ?? '20', 10);
        const { category, search } = request.query;
        const correlationId = (request as any).correlationId;

        const result = await service.listParts({ page, pageSize }, category, search, correlationId);
        return reply.send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // POST /api/parts
  fastify.post(
    '/parts',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Create part',
        body: {
          type: 'object',
          required: ['sku', 'name'],
          properties: {
            sku: { type: 'string', example: 'OIL-FILTER-001' },
            name: { type: 'string', example: 'Oil Filter' },
            description: { type: 'string' },
            category: { type: 'string', example: 'Filters' },
            manufacturer: { type: 'string', example: 'Mann-Filter' },
            unitPrice: { $ref: 'Money#' },
            costPrice: { $ref: 'Money#' },
            initialStock: { type: 'integer', example: 10 },
            reorderLevel: { type: 'integer', example: 5 },
            location: { type: 'string', example: 'Shelf A-3' },
            compatibleMakes: { type: 'array', items: { type: 'string' }, example: ['Toyota', 'Honda'] },
          },
        },
        response: {
          201: { $ref: 'Part#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreatePartRequest }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const part = await service.createPart(request.body, correlationId);
        return reply.status(201).send(part);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/parts/:id
  fastify.get(
    '/parts/:id',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Get part by ID',
        params: idParam,
        response: {
          200: { $ref: 'Part#' },
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
        const part = await service.getPart(request.params.id, correlationId);
        return reply.send(part);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // PUT /api/parts/:id
  fastify.put(
    '/parts/:id',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Update part',
        params: idParam,
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            unitPrice: { $ref: 'Money#' },
            costPrice: { $ref: 'Money#' },
            reorderLevel: { type: 'integer' },
            location: { type: 'string' },
          },
        },
        response: {
          200: { $ref: 'Part#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Omit<UpdatePartRequest, 'id'>;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const part = await service.updatePart({
          ...request.body,
          id: request.params.id,
        }, correlationId);
        return reply.send(part);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );
}
