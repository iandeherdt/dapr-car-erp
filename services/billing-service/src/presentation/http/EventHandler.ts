import http from 'http';
import { randomUUID } from 'crypto';
import { CreateInvoiceUseCase } from '../../application/use-cases/CreateInvoiceUseCase';
import { withCorrelation } from '../../logger';

export const daprSubscriptions = [
  { pubsubname: 'car-erp-pubsub', topic: 'workorder.completed', route: '/events/workorder-completed' },
  { pubsubname: 'car-erp-pubsub', topic: 'customer.updated', route: '/events/customer-updated' },
];

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createHttpServer(createInvoiceUC: CreateInvoiceUseCase): http.Server {
  return http.createServer((req, res) => {
    const { method, url } = req;

    if (method === 'GET' && url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (method === 'GET' && url === '/dapr/subscribe') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(daprSubscriptions));
      return;
    }

    if (method === 'POST' && url === '/events/workorder-completed') {
      handleWorkOrderCompleted(req, res, createInvoiceUC).catch((err) => {
        console.error('[event-handler] Unhandled error:', err);
        if (!res.headersSent) { res.writeHead(500); res.end(); }
      });
      return;
    }

    if (method === 'POST' && url === '/events/customer-updated') {
      handleCustomerUpdated(req, res).catch((err) => {
        console.error('[event-handler] Unhandled error:', err);
        if (!res.headersSent) { res.writeHead(500); res.end(); }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}

async function handleWorkOrderCompleted(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  createInvoiceUC: CreateInvoiceUseCase,
): Promise<void> {
  const raw = await readBody(req);
  let correlationId = 'unknown';
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (parsed.data ?? parsed) as any;
    correlationId = payload?.correlation_id ?? parsed?.correlation_id ?? randomUUID();

    const log = withCorrelation(correlationId, 'event.workorder.completed');

    if (!payload.work_order_id || !payload.customer_id) {
      log.warn({ payload }, 'workorder.completed: missing required fields');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ignored', reason: 'missing required fields' }));
      return;
    }

    const TAX_RATE = 0.21;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partLineItems = (payload.line_items ?? []).map((item: any) => ({
      description: item.part_name,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      totalCents: item.total_price_cents,
      lineType: 'part' as const,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const laborLineItems = (payload.labor_entries ?? []).map((entry: any) => ({
      description: entry.description,
      quantity: 1,
      unitPriceCents: entry.total_cents,
      totalCents: entry.total_cents,
      lineType: 'labor' as const,
    }));

    const invoice = await createInvoiceUC.execute({
      workOrderId: payload.work_order_id,
      customerId: payload.customer_id,
      lineItems: [...partLineItems, ...laborLineItems],
      taxRate: TAX_RATE,
      notes: 'Auto-generated from completed work order',
    });

    log.info({ invoiceId: invoice.id }, 'Invoice created from workorder.completed event');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', invoice_id: invoice.id }));
  } catch (err) {
    const log = withCorrelation(correlationId, 'event.workorder.completed');
    log.error({ error: { message: (err as Error).message } }, 'Error creating invoice from event');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

async function handleCustomerUpdated(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  await readBody(req);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
}
