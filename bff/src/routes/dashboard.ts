import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { GrpcClientError } from '../clients/grpc-client.js';
import type { IWorkOrderService } from '../application/services/IWorkOrderService.js';
import type { IInventoryService } from '../application/services/IInventoryService.js';
import type { IBillingService } from '../application/services/IBillingService.js';

export interface DashboardRouteOptions extends FastifyPluginOptions {
  workOrderService: IWorkOrderService;
  inventoryService: IInventoryService;
  billingService: IBillingService;
}

function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof GrpcClientError) {
    return reply.status(err.httpStatus).send({ error: err.message, code: err.grpcCode });
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return reply.status(500).send({ error: message });
}

export async function dashboardRoutes(fastify: FastifyInstance, opts: DashboardRouteOptions): Promise<void> {
  const { workOrderService, inventoryService, billingService } = opts;

  // GET /api/dashboard
  fastify.get(
    '/dashboard',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Get dashboard statistics',
        description:
          'Aggregates data from work-order, inventory, and billing services in parallel. ' +
          'Returns the 5 most recent work orders, counts of active work orders, low-stock parts, and pending invoices.',
        response: {
          200: { $ref: 'DashboardStats#' },
          500: { $ref: 'ApiError#' },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const [recentWorkOrdersResult, inProgressResult, lowStockResult, pendingInvoicesResult] =
          await Promise.all([
            workOrderService.listWorkOrders({ page: 1, pageSize: 5 }),
            workOrderService.listWorkOrders(
              { page: 1, pageSize: 1 },
              'WORK_ORDER_STATUS_IN_PROGRESS',
            ),
            inventoryService.listLowStockParts({ page: 1, pageSize: 1 }),
            billingService.listInvoices({ page: 1, pageSize: 1 }, 'INVOICE_STATUS_SENT'),
          ]);

        return reply.send({
          recentWorkOrders: recentWorkOrdersResult.workOrders,
          activeWorkOrderCount: inProgressResult.pagination.totalCount,
          lowStockCount: lowStockResult.pagination.totalCount,
          pendingInvoiceCount: pendingInvoicesResult.pagination.totalCount,
        });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );
}
