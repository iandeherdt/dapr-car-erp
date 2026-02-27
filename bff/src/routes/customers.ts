import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GrpcClientError } from '../clients/grpc-client.js';
import * as customerClient from '../clients/customer-client.js';

function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof GrpcClientError) {
    return reply.status(err.httpStatus).send({ error: err.message, code: err.grpcCode });
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return reply.status(500).send({ error: message });
}

export async function customerRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/customers
  fastify.get(
    '/customers',
    async (
      request: FastifyRequest<{
        Querystring: { page?: string; pageSize?: string; search?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const page = parseInt(request.query.page ?? '1', 10);
        const pageSize = parseInt(request.query.pageSize ?? '20', 10);
        const search = request.query.search;
        const correlationId = (request as any).correlationId;

        const result = await customerClient.listCustomers({ page, pageSize }, search, correlationId);
        return reply.send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // POST /api/customers
  fastify.post(
    '/customers',
    async (
      request: FastifyRequest<{ Body: customerClient.CreateCustomerRequest }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const customer = await customerClient.createCustomer(request.body, correlationId);
        return reply.status(201).send(customer);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/customers/:id
  fastify.get(
    '/customers/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const customer = await customerClient.getCustomer(request.params.id, correlationId);
        return reply.send(customer);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // PUT /api/customers/:id
  fastify.put(
    '/customers/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: customerClient.CreateCustomerRequest;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const updated = await customerClient.updateCustomer({
          ...request.body,
          id: request.params.id,
        }, correlationId);
        return reply.send(updated);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // DELETE /api/customers/:id
  fastify.delete(
    '/customers/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        await customerClient.deleteCustomer(request.params.id, correlationId);
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // POST /api/customers/:id/vehicles
  fastify.post(
    '/customers/:id/vehicles',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Omit<customerClient.AddVehicleRequest, 'customerId'>;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const vehicle = await customerClient.addVehicle({
          ...request.body,
          customerId: request.params.id,
        }, correlationId);
        return reply.status(201).send(vehicle);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // PUT /api/customers/:id/vehicles/:vid
  fastify.put(
    '/customers/:id/vehicles/:vid',
    async (
      request: FastifyRequest<{
        Params: { id: string; vid: string };
        Body: Omit<customerClient.UpdateVehicleRequest, 'id' | 'customerId'>;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const vehicle = await customerClient.updateVehicle({
          ...request.body,
          id: request.params.vid,
          customerId: request.params.id,
        }, correlationId);
        return reply.send(vehicle);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );
}
