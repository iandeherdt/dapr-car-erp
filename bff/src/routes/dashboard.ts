import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GrpcClientError } from '../clients/grpc-client.js';
import * as workOrderClient from '../clients/workorder-client.js';
import * as inventoryClient from '../clients/inventory-client.js';
import * as billingClient from '../clients/billing-client.js';

function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof GrpcClientError) {
    return reply.status(err.httpStatus).send({ error: err.message, code: err.grpcCode });
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return reply.status(500).send({ error: message });
}

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
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
        // Fetch all dashboard data concurrently from multiple services
        const [recentWorkOrdersResult, inProgressResult, lowStockResult, pendingInvoicesResult] =
          await Promise.all([
            // Recent work orders (latest 5, no status filter)
            workOrderClient.listWorkOrders({ page: 1, pageSize: 5 }),
            // Active work orders (IN_PROGRESS status)
            workOrderClient.listWorkOrders(
              { page: 1, pageSize: 1 },
              'WORK_ORDER_STATUS_IN_PROGRESS',
            ),
            // Low stock parts
            inventoryClient.listLowStockParts({ page: 1, pageSize: 1 }),
            // Pending invoices (SENT status = awaiting payment)
            billingClient.listInvoices({ page: 1, pageSize: 1 }, 'INVOICE_STATUS_SENT'),
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
