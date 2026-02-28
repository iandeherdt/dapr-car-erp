import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { GrpcClientError } from '../clients/grpc-client.js';
import type { IWorkOrderService } from '../application/services/IWorkOrderService.js';
import type { ICustomerService } from '../application/services/ICustomerService.js';
import type { WorkOrderStatus, AddLaborEntryRequest } from '../clients/workorder-client.js';

export interface WorkOrderRouteOptions extends FastifyPluginOptions {
  workOrderService: IWorkOrderService;
  customerService: ICustomerService;
}

function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof GrpcClientError) {
    return reply.status(err.httpStatus).send({ error: err.message, code: err.grpcCode });
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return reply.status(500).send({ error: message });
}

/** Map proto enum strings to the lowercase WorkOrderStatus the frontend expects. */
function normalizeStatus(raw: string): string {
  return raw
    .replace(/^WORK_ORDER_STATUS_/, '')
    .toLowerCase()
    .replace('unspecified', 'draft');
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

export async function workOrderRoutes(fastify: FastifyInstance, opts: WorkOrderRouteOptions): Promise<void> {
  const { workOrderService, customerService } = opts;

  // GET /api/work-orders
  fastify.get(
    '/work-orders',
    {
      schema: {
        tags: ['Work Orders'],
        summary: 'List work orders',
        description: 'Returns a paginated list of work orders with optional status and customer filters.',
        querystring: {
          type: 'object',
          properties: {
            ...paginationQuery,
            status: {
              type: 'string',
              enum: ['draft', 'pending', 'in_progress', 'awaiting_parts', 'completed', 'cancelled', 'invoiced'],
              description: 'Filter by status',
            },
            customerId: { type: 'string', format: 'uuid', description: 'Filter by customer' },
          },
        },
        response: {
          200: { $ref: 'ListWorkOrdersResponse#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: string;
          pageSize?: string;
          status?: WorkOrderStatus;
          customerId?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const page = parseInt(request.query.page ?? '1', 10);
        const pageSize = parseInt(request.query.pageSize ?? '20', 10);
        const { status, customerId } = request.query;
        const correlationId = (request as any).correlationId;

        const result = await workOrderService.listWorkOrders(
          { page, pageSize },
          status,
          customerId,
          correlationId,
        );
        return reply.send({
          ...result,
          workOrders: result.workOrders.map(wo => ({ ...wo, status: normalizeStatus(wo.status) })),
        });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // POST /api/work-orders
  fastify.post(
    '/work-orders',
    {
      schema: {
        tags: ['Work Orders'],
        summary: 'Create work order',
        body: {
          type: 'object',
          required: ['customerId', 'vehicleId', 'description'],
          properties: {
            customerId: { type: 'string', format: 'uuid' },
            vehicleId: { type: 'string', format: 'uuid' },
            description: { type: 'string', example: 'Annual service + brake inspection' },
            assignedMechanic: { type: 'string', example: 'Pieter De Smedt' },
            notes: { type: 'string' },
          },
        },
        response: {
          201: { $ref: 'WorkOrder#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { customerId: string; vehicleId: string; description: string; assignedMechanic?: string; notes?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const workOrder = await workOrderService.createWorkOrder(request.body, correlationId);
        return reply.status(201).send(workOrder);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/work-orders/:id  — Aggregated: WO + Customer + Vehicle in parallel
  fastify.get(
    '/work-orders/:id',
    {
      schema: {
        tags: ['Work Orders'],
        summary: 'Get work order by ID (aggregated)',
        description: 'Returns the work order with embedded customer and vehicle details fetched in parallel.',
        params: idParam,
        response: {
          200: { $ref: 'WorkOrderAggregated#' },
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
        const workOrder = await workOrderService.getWorkOrder(request.params.id, correlationId);

        const [customer, vehicle] = await Promise.all([
          customerService.getCustomer(workOrder.customerId, correlationId),
          customerService.getVehicle(workOrder.vehicleId, correlationId),
        ]);

        return reply.send({
          ...workOrder,
          status: normalizeStatus(workOrder.status),
          customer,
          vehicle,
        });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/work-orders/:id/aggregated — primary endpoint used by the workorders frontend
  fastify.get(
    '/work-orders/:id/aggregated',
    {
      schema: {
        tags: ['Work Orders'],
        summary: 'Get aggregated work order',
        description: 'Alias for GET /work-orders/:id. Returns the work order with embedded customer and vehicle.',
        params: idParam,
        response: {
          200: { $ref: 'WorkOrderAggregated#' },
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
        const workOrder = await workOrderService.getWorkOrder(request.params.id, correlationId);

        const [customer, vehicle] = await Promise.all([
          customerService.getCustomer(workOrder.customerId, correlationId),
          customerService.getVehicle(workOrder.vehicleId, correlationId),
        ]);

        return reply.send({
          ...workOrder,
          status: normalizeStatus(workOrder.status),
          customer,
          vehicle,
        });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // PUT /api/work-orders/:id/status
  fastify.put(
    '/work-orders/:id/status',
    {
      schema: {
        tags: ['Work Orders'],
        summary: 'Update work order status',
        params: idParam,
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['draft', 'pending', 'in_progress', 'awaiting_parts', 'completed', 'cancelled', 'invoiced'],
            },
          },
        },
        response: {
          200: { $ref: 'WorkOrder#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { status: WorkOrderStatus };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const workOrder = await workOrderService.updateWorkOrderStatus({
          id: request.params.id,
          newStatus: request.body.status,
        }, correlationId);
        return reply.send(workOrder);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // POST /api/work-orders/:id/line-items
  fastify.post(
    '/work-orders/:id/line-items',
    {
      schema: {
        tags: ['Work Orders'],
        summary: 'Add line item to work order',
        description: 'Adds a part to the work order. Inventory is reserved automatically.',
        params: idParam,
        body: {
          type: 'object',
          required: ['partId', 'quantity'],
          properties: {
            partId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1, example: 2 },
          },
        },
        response: {
          201: { $ref: 'WorkOrder#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { partId: string; quantity: number };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const workOrder = await workOrderService.addLineItem({
          workOrderId: request.params.id,
          partId: request.body.partId,
          quantity: request.body.quantity,
        }, correlationId);
        return reply.status(201).send(workOrder);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // DELETE /api/work-orders/:id/line-items/:lid
  fastify.delete(
    '/work-orders/:id/line-items/:lid',
    {
      schema: {
        tags: ['Work Orders'],
        summary: 'Remove line item from work order',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Work order ID' },
            lid: { type: 'string', format: 'uuid', description: 'Line item ID' },
          },
          required: ['id', 'lid'],
        },
        response: {
          200: { $ref: 'WorkOrder#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string; lid: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const workOrder = await workOrderService.removeLineItem({
          workOrderId: request.params.id,
          lineItemId: request.params.lid,
        }, correlationId);
        return reply.send(workOrder);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // POST /api/work-orders/:id/labor
  fastify.post(
    '/work-orders/:id/labor',
    {
      schema: {
        tags: ['Work Orders'],
        summary: 'Add labor entry to work order',
        params: idParam,
        body: {
          type: 'object',
          required: ['description', 'hours', 'hourlyRate'],
          properties: {
            description: { type: 'string', example: 'Oil change and filter replacement' },
            mechanicName: { type: 'string', example: 'Pieter De Smedt' },
            hours: { type: 'number', example: 2.5 },
            hourlyRate: { $ref: 'Money#' },
          },
        },
        response: {
          201: { $ref: 'WorkOrder#' },
          ...errorResponses,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Omit<AddLaborEntryRequest, 'workOrderId'>;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const body = request.body as any;
        const workOrder = await workOrderService.addLaborEntry({
          workOrderId: request.params.id,
          description: body.description,
          mechanicName: body.mechanicName ?? body.technicianName,
          hours: body.hours ?? body.hoursWorked,
          hourlyRate: body.hourlyRate,
        }, correlationId);
        return reply.status(201).send(workOrder);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );
}
