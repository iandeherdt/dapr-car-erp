import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GrpcClientError } from '../clients/grpc-client.js';
import * as inventoryClient from '../clients/inventory-client.js';

function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof GrpcClientError) {
    return reply.status(err.httpStatus).send({ error: err.message, code: err.grpcCode });
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return reply.status(500).send({ error: message });
}

export async function inventoryRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/parts/low-stock  — must be registered BEFORE /api/parts/:id to avoid param clash
  fastify.get(
    '/parts/low-stock',
    async (
      request: FastifyRequest<{ Querystring: { page?: string; pageSize?: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const page = parseInt(request.query.page ?? '1', 10);
        const pageSize = parseInt(request.query.pageSize ?? '20', 10);
        const correlationId = (request as any).correlationId;

        const result = await inventoryClient.listLowStockParts({ page, pageSize }, correlationId);
        return reply.send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/parts
  fastify.get(
    '/parts',
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

        const result = await inventoryClient.listParts({ page, pageSize }, category, search, correlationId);
        return reply.send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // POST /api/parts
  fastify.post(
    '/parts',
    async (
      request: FastifyRequest<{ Body: inventoryClient.CreatePartRequest }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const part = await inventoryClient.createPart(request.body, correlationId);
        return reply.status(201).send(part);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/parts/:id
  fastify.get(
    '/parts/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const part = await inventoryClient.getPart(request.params.id, correlationId);
        return reply.send(part);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // PUT /api/parts/:id
  fastify.put(
    '/parts/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Omit<inventoryClient.UpdatePartRequest, 'id'>;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const part = await inventoryClient.updatePart({
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
