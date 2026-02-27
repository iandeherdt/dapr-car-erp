import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GrpcClientError } from '../clients/grpc-client.js';
import * as workOrderClient from '../clients/workorder-client.js';
import * as customerClient from '../clients/customer-client.js';

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

export async function workOrderRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/work-orders
  fastify.get(
    '/work-orders',
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: string;
          pageSize?: string;
          status?: workOrderClient.WorkOrderStatus;
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

        const result = await workOrderClient.listWorkOrders(
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
    async (
      request: FastifyRequest<{ Body: workOrderClient.CreateWorkOrderRequest }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const workOrder = await workOrderClient.createWorkOrder(request.body, correlationId);
        return reply.status(201).send(workOrder);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // GET /api/work-orders/:id  — Aggregated: WO + Customer + Vehicle in parallel
  fastify.get(
    '/work-orders/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const workOrder = await workOrderClient.getWorkOrder(request.params.id, correlationId);

        const [customer, vehicle] = await Promise.all([
          customerClient.getCustomer(workOrder.customerId, correlationId),
          customerClient.getVehicle(workOrder.vehicleId, correlationId),
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
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const workOrder = await workOrderClient.getWorkOrder(request.params.id, correlationId);

        const [customer, vehicle] = await Promise.all([
          customerClient.getCustomer(workOrder.customerId, correlationId),
          customerClient.getVehicle(workOrder.vehicleId, correlationId),
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
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { status: workOrderClient.WorkOrderStatus };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const workOrder = await workOrderClient.updateWorkOrderStatus({
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
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { partId: string; quantity: number };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const workOrder = await workOrderClient.addLineItem({
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
    async (
      request: FastifyRequest<{ Params: { id: string; lid: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const workOrder = await workOrderClient.removeLineItem({
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
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Omit<workOrderClient.AddLaborEntryRequest, 'workOrderId'>;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const correlationId = (request as any).correlationId;
        const body = request.body as any;
        const workOrder = await workOrderClient.addLaborEntry({
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
