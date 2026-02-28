import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { GrpcClientError } from '../clients/grpc-client.js';
import type { ICustomerService } from '../application/services/ICustomerService.js';
import type { CreateCustomerRequest, AddVehicleRequest } from '../clients/customer-client.js';

export interface CustomerRouteOptions extends FastifyPluginOptions {
  service: ICustomerService;
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

export async function customerRoutes(fastify: FastifyInstance, opts: CustomerRouteOptions): Promise<void> {
  const { service } = opts;

  // GET /api/customers
  fastify.get(
    '/customers',
    {
      schema: {
        tags: ['Customers'],
        summary: 'List customers',
        description: 'Returns a paginated list of customers with optional full-text search.',
        querystring: {
          type: 'object',
          properties: {
            ...paginationQuery,
            search: { type: 'string', description: 'Full-text search across name, email, phone' },
          },
        },
        response: {
          200: { $ref: 'ListCustomersResponse#' },
          ...errorResponses,
        },
      },
    },
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

        const result = await service.listCustomers({ page, pageSize }, search, correlationId);
        return reply.send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // POST /api/customers
  fastify.post(
    '/customers',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Create customer',
        body: {
          type: 'object',
          required: ['firstName', 'lastName', 'email'],
          properties: {
            firstName: { type: 'string', example: 'Jan' },
            lastName: { type: 'string', example: 'Janssen' },
            email: { type: 'string', format: 'email', example: 'jan.janssen@example.com' },
            phone: { type: 'string', example: '+32 475 12 34 56' },
            addressLine1: { type: 'string', example: 'Antwerpsestraat 42' },
            addressLine2: { type: 'string' },
            city: { type: 'string', example: 'Ghent' },
            postalCode: { type: 'string', example: '9000' },
            country: { type: 'string', example: 'Belgium' },
            companyName: { type: 'string' },
            vatNumber: { type: 'string', example: 'BE0123456789' },
          },
        },
        response: {
          201: { $ref: 'Customer#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateCustomerRequest }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const customer = await service.createCustomer(request.body, correlationId);
        return reply.status(201).send(customer);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/customers/:id
  fastify.get(
    '/customers/:id',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Get customer by ID',
        params: idParam,
        response: {
          200: { $ref: 'Customer#' },
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
        const customer = await service.getCustomer(request.params.id, correlationId);
        return reply.send(customer);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // PUT /api/customers/:id
  fastify.put(
    '/customers/:id',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Update customer',
        params: idParam,
        body: {
          type: 'object',
          required: ['firstName', 'lastName', 'email'],
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            addressLine1: { type: 'string' },
            addressLine2: { type: 'string' },
            city: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            companyName: { type: 'string' },
            vatNumber: { type: 'string' },
          },
        },
        response: {
          200: { $ref: 'Customer#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: CreateCustomerRequest;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const updated = await service.updateCustomer({
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
    {
      schema: {
        tags: ['Customers'],
        summary: 'Delete customer',
        params: idParam,
        response: {
          204: { type: 'null', description: 'Customer deleted' },
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
        await service.deleteCustomer(request.params.id, correlationId);
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // POST /api/customers/:id/vehicles
  fastify.post(
    '/customers/:id/vehicles',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Add vehicle to customer',
        params: idParam,
        body: {
          type: 'object',
          required: ['make', 'model', 'year'],
          properties: {
            make: { type: 'string', example: 'Toyota' },
            model: { type: 'string', example: 'Corolla' },
            year: { type: 'integer', example: 2020 },
            vin: { type: 'string', example: '1HGBH41JXMN109186' },
            licensePlate: { type: 'string', example: '1-ABC-123' },
            mileageKm: { type: 'integer', example: 45000 },
            color: { type: 'string', example: 'Silver' },
            engineType: {
              type: 'string',
              enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid'],
            },
          },
        },
        response: {
          201: { $ref: 'Vehicle#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Omit<AddVehicleRequest, 'customerId'>;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const vehicle = await service.addVehicle({
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
    {
      schema: {
        tags: ['Customers'],
        summary: 'Update vehicle',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Customer ID' },
            vid: { type: 'string', format: 'uuid', description: 'Vehicle ID' },
          },
          required: ['id', 'vid'],
        },
        body: {
          type: 'object',
          required: ['make', 'model', 'year'],
          properties: {
            make: { type: 'string' },
            model: { type: 'string' },
            year: { type: 'integer' },
            vin: { type: 'string' },
            licensePlate: { type: 'string' },
            mileageKm: { type: 'integer' },
            color: { type: 'string' },
            engineType: {
              type: 'string',
              enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid'],
            },
          },
        },
        response: {
          200: { $ref: 'Vehicle#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string; vid: string };
        Body: Omit<AddVehicleRequest, 'customerId'>;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const vehicle = await service.updateVehicle({
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
