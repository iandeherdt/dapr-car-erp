import * as grpc from "@grpc/grpc-js";
import mongoose from "mongoose";
import { Invoice, IInvoice, ILineItem, InvoiceStatus } from "../domain/invoice";
import { getNextInvoiceNumber } from "../domain/counter";
import { publishEvent } from "../events/publisher";
import { logger } from "../logger";

// ---------------------------------------------------------------------------
// Type definitions for proto-loader output
// These mirror the protobuf message shapes used by @grpc/proto-loader
// ---------------------------------------------------------------------------

interface MoneyProto {
  amount_cents: number;
  currency: string;
}

interface LineItemProto {
  id: string;
  description: string;
  quantity: number;
  unit_price: MoneyProto;
  total: MoneyProto;
  line_type: string;
}

interface InvoiceProto {
  id: string;
  invoice_number: string;
  work_order_id: string;
  customer_id: string;
  status: number;
  line_items: LineItemProto[];
  subtotal: MoneyProto;
  tax_amount: MoneyProto;
  tax_rate: number;
  total: MoneyProto;
  issued_at: string;
  due_at: string;
  paid_at: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Status mapping between Mongoose strings and proto enum integers
// ---------------------------------------------------------------------------

const STATUS_TO_PROTO: Record<InvoiceStatus, number> = {
  draft: 1,      // INVOICE_STATUS_DRAFT
  sent: 2,       // INVOICE_STATUS_SENT
  paid: 3,       // INVOICE_STATUS_PAID
  overdue: 4,    // INVOICE_STATUS_OVERDUE
  cancelled: 5,  // INVOICE_STATUS_CANCELLED
};

const PROTO_TO_STATUS: Record<number, InvoiceStatus> = {
  1: "draft",
  2: "sent",
  3: "paid",
  4: "overdue",
  5: "cancelled",
};

// ---------------------------------------------------------------------------
// Helper: build a Money message
// ---------------------------------------------------------------------------

function money(cents: number, currency = "EUR"): MoneyProto {
  return { amount_cents: cents, currency };
}

// ---------------------------------------------------------------------------
// Helper: map a Mongoose Invoice document to a proto Invoice message
// ---------------------------------------------------------------------------

function toProtoInvoice(doc: IInvoice): InvoiceProto {
  const lineItems: LineItemProto[] = doc.lineItems.map((item) => ({
    id: (item as ILineItem & { _id?: mongoose.Types.ObjectId })._id?.toString() ?? "",
    description: item.description,
    quantity: item.quantity,
    unit_price: money(item.unitPriceCents),
    total: money(item.totalCents),
    line_type: item.lineType,
  }));

  return {
    id: doc._id.toString(),
    invoice_number: doc.invoiceNumber,
    work_order_id: doc.workOrderId,
    customer_id: doc.customerId,
    status: STATUS_TO_PROTO[doc.status] ?? 0,
    line_items: lineItems,
    subtotal: money(doc.subtotalCents),
    tax_amount: money(doc.taxAmountCents),
    tax_rate: doc.taxRate,
    total: money(doc.totalCents),
    issued_at: doc.issuedAt?.toISOString() ?? "",
    due_at: doc.dueAt?.toISOString() ?? "",
    paid_at: doc.paidAt?.toISOString() ?? "",
    notes: doc.notes ?? "",
    created_at: doc.createdAt.toISOString(),
    updated_at: doc.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helper: compute subtotal, tax, and total from line items
// ---------------------------------------------------------------------------

function computeTotals(
  lineItems: ILineItem[],
  taxRate: number
): { subtotalCents: number; taxAmountCents: number; totalCents: number } {
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
  const taxAmountCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxAmountCents;
  return { subtotalCents, taxAmountCents, totalCents };
}

// ---------------------------------------------------------------------------
// gRPC handler implementations
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GrpcCallback = (err: grpc.ServiceError | null, response?: any) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createInvoice(call: any, callback: GrpcCallback): Promise<void> {
  try {
    const req = call.request as {
      work_order_id: string;
      customer_id: string;
      line_items: Array<{
        description: string;
        quantity: number;
        unit_price: MoneyProto;
        total: MoneyProto;
        line_type: string;
      }>;
      tax_rate: number;
      notes?: string;
    };

    const taxRate = req.tax_rate > 0 ? req.tax_rate : 0.21;

    const lineItems: ILineItem[] = (req.line_items ?? []).map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPriceCents: li.unit_price?.amount_cents ?? 0,
      totalCents: li.total?.amount_cents ?? 0,
      lineType: (li.line_type === "labor" ? "labor" : "part") as "part" | "labor",
    }));

    const { subtotalCents, taxAmountCents, totalCents } = computeTotals(lineItems, taxRate);
    const invoiceNumber = await getNextInvoiceNumber();

    const now = new Date();
    const dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() + 30);

    const invoice = new Invoice({
      invoiceNumber,
      workOrderId: req.work_order_id,
      customerId: req.customer_id,
      status: "draft",
      lineItems,
      subtotalCents,
      taxRate,
      taxAmountCents,
      totalCents,
      issuedAt: now,
      dueAt,
      notes: req.notes ?? "",
    });

    await invoice.save();

    publishEvent("invoice.created", {
      invoice_id: invoice._id.toString(),
      invoice_number: invoice.invoiceNumber,
      work_order_id: invoice.workOrderId,
      customer_id: invoice.customerId,
      total_cents: invoice.totalCents,
      currency: "EUR",
    }).catch((err) =>
      logger.error({ error: { message: err.message } }, 'Failed to publish invoice.created event')
    );

    callback(null, toProtoInvoice(invoice));
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : "Internal error",
    } as grpc.ServiceError);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getInvoice(call: any, callback: GrpcCallback): Promise<void> {
  try {
    const id = call.request["id"] as string;

    if (!id || !mongoose.isValidObjectId(id)) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: "A valid invoice id is required",
      } as grpc.ServiceError);
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Invoice not found: ${id}`,
      } as grpc.ServiceError);
    }

    callback(null, toProtoInvoice(invoice));
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : "Internal error",
    } as grpc.ServiceError);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listInvoices(call: any, callback: GrpcCallback): Promise<void> {
  try {
    const req = call.request as {
      pagination?: { page: number; page_size: number };
      status_filter?: number;
    };

    const page = Math.max(1, req.pagination?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, req.pagination?.page_size ?? 20));
    const skip = (page - 1) * pageSize;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (req.status_filter && req.status_filter !== 0) {
      const statusStr = PROTO_TO_STATUS[req.status_filter];
      if (statusStr) filter.status = statusStr;
    }

    const [invoices, totalCount] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Invoice.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    callback(null, {
      invoices: invoices.map(toProtoInvoice),
      pagination: { total_count: totalCount, page, page_size: pageSize, total_pages: totalPages },
    });
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : "Internal error",
    } as grpc.ServiceError);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateInvoiceStatus(call: any, callback: GrpcCallback): Promise<void> {
  try {
    const req = call.request as { id: string; new_status: number };

    if (!req.id || !mongoose.isValidObjectId(req.id)) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: "A valid invoice id is required",
      } as grpc.ServiceError);
    }

    const newStatusStr = PROTO_TO_STATUS[req.new_status];
    if (!newStatusStr) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: `Unknown status value: ${req.new_status}`,
      } as grpc.ServiceError);
    }

    const invoice = await Invoice.findById(req.id);
    if (!invoice) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Invoice not found: ${req.id}`,
      } as grpc.ServiceError);
    }

    const previousStatus = invoice.status;
    invoice.status = newStatusStr;

    if (newStatusStr === "paid" && !invoice.paidAt) {
      invoice.paidAt = new Date();
    }

    await invoice.save();

    if (newStatusStr === "paid" && previousStatus !== "paid") {
      publishEvent("invoice.paid", {
        invoice_id: invoice._id.toString(),
        invoice_number: invoice.invoiceNumber,
        work_order_id: invoice.workOrderId,
        customer_id: invoice.customerId,
        total_cents: invoice.totalCents,
        currency: "EUR",
        paid_at: invoice.paidAt?.toISOString(),
      }).catch((err) =>
        logger.error({ error: { message: err.message } }, 'Failed to publish invoice.paid event')
      );
    }

    callback(null, toProtoInvoice(invoice));
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : "Internal error",
    } as grpc.ServiceError);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getInvoicesByCustomer(call: any, callback: GrpcCallback): Promise<void> {
  try {
    const req = call.request as {
      customer_id: string;
      pagination?: { page: number; page_size: number };
    };

    if (!req.customer_id) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: "customer_id is required",
      } as grpc.ServiceError);
    }

    const page = Math.max(1, req.pagination?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, req.pagination?.page_size ?? 20));
    const skip = (page - 1) * pageSize;

    const [invoices, totalCount] = await Promise.all([
      Invoice.find({ customerId: req.customer_id }).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Invoice.countDocuments({ customerId: req.customer_id }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    callback(null, {
      invoices: invoices.map(toProtoInvoice),
      pagination: { total_count: totalCount, page, page_size: pageSize, total_pages: totalPages },
    });
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : "Internal error",
    } as grpc.ServiceError);
  }
}
