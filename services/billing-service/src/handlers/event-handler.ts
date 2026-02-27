import http from "http";
import { randomUUID } from "crypto";
import { Invoice, ILineItem } from "../domain/invoice";
import { getNextInvoiceNumber } from "../domain/counter";
import { publishEvent } from "../events/publisher";
import { withCorrelation } from "../logger";

// ---------------------------------------------------------------------------
// Dapr subscription declaration
// Returned by GET /dapr/subscribe so the Dapr sidecar knows which topics
// to forward to this application.
// ---------------------------------------------------------------------------

export const daprSubscriptions = [
  {
    pubsubname: "car-erp-pubsub",
    topic: "workorder.completed",
    route: "/events/workorder-completed",
  },
  {
    pubsubname: "car-erp-pubsub",
    topic: "customer.updated",
    route: "/events/customer-updated",
  },
];

// ---------------------------------------------------------------------------
// Payload types for incoming events
// ---------------------------------------------------------------------------

interface WorkOrderLineItem {
  part_name: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
}

interface WorkOrderLaborEntry {
  description: string;
  hours: number;
  hourly_rate_cents: number;
  total_cents: number;
}

interface WorkOrderCompletedPayload {
  work_order_id: string;
  customer_id: string;
  line_items?: WorkOrderLineItem[];
  labor_entries?: WorkOrderLaborEntry[];
}

// ---------------------------------------------------------------------------
// Helper: read the full body of an incoming HTTP request as a string
// ---------------------------------------------------------------------------

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Handler: POST /events/workorder-completed
//
// Dapr wraps the published payload inside a CloudEvents envelope:
// { data: { ...original payload }, topic: "...", ... }
// We support both the envelope and the raw payload format.
// ---------------------------------------------------------------------------

async function handleWorkOrderCompleted(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const raw = await readBody(req);

  let payload: WorkOrderCompletedPayload;
  let correlationId = 'unknown';
  try {
    const parsed = JSON.parse(raw) as {
      data?: WorkOrderCompletedPayload & { correlation_id?: string };
      work_order_id?: string;
      customer_id?: string;
      correlation_id?: string;
      line_items?: WorkOrderLineItem[];
      labor_entries?: WorkOrderLaborEntry[];
    };

    // Dapr CloudEvents envelope wraps the original payload under "data"
    payload = (parsed.data ?? parsed) as WorkOrderCompletedPayload;
    correlationId = (parsed.data as any)?.correlation_id ?? parsed.correlation_id ?? randomUUID();
  } catch {
    const log = withCorrelation(randomUUID(), 'event.workorder.completed');
    log.error({ error: { message: 'Failed to parse body' } }, 'workorder.completed: invalid JSON body');
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON" }));
    return;
  }

  const log = withCorrelation(correlationId, 'event.workorder.completed');

  if (!payload.work_order_id || !payload.customer_id) {
    log.warn({ payload }, 'workorder.completed: missing required fields, ignoring');
    // Return 200 to Dapr so it does not endlessly retry a fundamentally malformed message
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ignored", reason: "missing required fields" }));
    return;
  }

  try {
    // Build line items from parts
    const partLineItems: ILineItem[] = (payload.line_items ?? []).map((item) => ({
      description: item.part_name,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      totalCents: item.total_price_cents,
      lineType: "part" as const,
    }));

    // Build line items from labor entries
    const laborLineItems: ILineItem[] = (payload.labor_entries ?? []).map((entry) => ({
      description: entry.description,
      quantity: 1, // labor is billed as a single line; hours are embedded in description if needed
      unitPriceCents: entry.total_cents, // total already computed by work-order service
      totalCents: entry.total_cents,
      lineType: "labor" as const,
    }));

    const lineItems = [...partLineItems, ...laborLineItems];

    const TAX_RATE = 0.21;
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
    const taxAmountCents = Math.round(subtotalCents * TAX_RATE);
    const totalCents = subtotalCents + taxAmountCents;

    const invoiceNumber = await getNextInvoiceNumber();

    const now = new Date();
    const dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() + 30); // Net-30

    const invoice = new Invoice({
      invoiceNumber,
      workOrderId: payload.work_order_id,
      customerId: payload.customer_id,
      status: "draft",
      lineItems,
      subtotalCents,
      taxRate: TAX_RATE,
      taxAmountCents,
      totalCents,
      issuedAt: now,
      dueAt,
      notes: "Auto-generated from completed work order",
    });

    await invoice.save();

    log.info({ invoiceId: invoice._id.toString(), invoiceNumber: invoice.invoiceNumber, workOrderId: payload.work_order_id }, 'Invoice created from workorder.completed event');

    publishEvent("invoice.created", {
      invoice_id: invoice._id.toString(),
      invoice_number: invoice.invoiceNumber,
      work_order_id: invoice.workOrderId,
      customer_id: invoice.customerId,
      total_cents: invoice.totalCents,
      currency: "EUR",
    }).catch((err) =>
      log.error({ error: { message: err.message } }, 'Failed to publish invoice.created event')
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", invoice_id: invoice._id.toString() }));
  } catch (err) {
    log.error({ error: { message: (err as Error).message, stack: (err as Error).stack } }, 'workorder.completed: error creating invoice');
    // Return 500 so Dapr will retry
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

// ---------------------------------------------------------------------------
// Handler: POST /events/customer-updated
// ---------------------------------------------------------------------------

async function handleCustomerUpdated(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const raw = await readBody(req);
  const log = withCorrelation(randomUUID(), 'event.customer.updated');
  log.info({ raw: raw.substring(0, 200) }, 'Received customer.updated event');

  // No-op for now — acknowledge so Dapr does not retry
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
}

// ---------------------------------------------------------------------------
// createHttpServer
//
// Creates and returns a Node.js http.Server that handles:
//   GET  /dapr/subscribe            – subscription declaration for Dapr
//   POST /events/workorder-completed – work order completed event
//   POST /events/customer-updated   – customer updated event
// ---------------------------------------------------------------------------

export function createHttpServer(): http.Server {
  const server = http.createServer((req, res) => {
    const { method, url } = req;

    // Health / liveness probe
    if (method === "GET" && url === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    // Dapr subscription declaration
    if (method === "GET" && url === "/dapr/subscribe") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(daprSubscriptions));
      return;
    }

    // Event routes
    if (method === "POST" && url === "/events/workorder-completed") {
      handleWorkOrderCompleted(req, res).catch((err) => {
        console.error("[event-handler] Unhandled error in workorder-completed handler:", err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end();
        }
      });
      return;
    }

    if (method === "POST" && url === "/events/customer-updated") {
      handleCustomerUpdated(req, res).catch((err) => {
        console.error("[event-handler] Unhandled error in customer-updated handler:", err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end();
        }
      });
      return;
    }

    // 404 for anything else
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  return server;
}
