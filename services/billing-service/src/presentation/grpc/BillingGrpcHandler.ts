import * as grpc from '@grpc/grpc-js';
import mongoose from 'mongoose';
import { CreateInvoiceUseCase } from '../../application/use-cases/CreateInvoiceUseCase';
import { GetInvoiceUseCase } from '../../application/use-cases/GetInvoiceUseCase';
import { ListInvoicesUseCase } from '../../application/use-cases/ListInvoicesUseCase';
import { UpdateInvoiceStatusUseCase } from '../../application/use-cases/UpdateInvoiceStatusUseCase';
import { GetInvoicesByCustomerUseCase } from '../../application/use-cases/GetInvoicesByCustomerUseCase';
import { NotFoundError, ValidationError } from '../../domain/errors';
import { InvoiceEntity } from '../../domain/entities/Invoice';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GrpcCallback = (err: grpc.ServiceError | null, response?: any) => void;

const STATUS_TO_PROTO: Record<string, number> = {
  draft: 1, sent: 2, paid: 3, overdue: 4, cancelled: 5,
};

function money(cents: number, currency = 'EUR') {
  return { amount_cents: cents, currency };
}

function toProtoInvoice(inv: InvoiceEntity) {
  return {
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    work_order_id: inv.workOrderId,
    customer_id: inv.customerId,
    status: STATUS_TO_PROTO[inv.status] ?? 0,
    line_items: inv.lineItems.map((li) => ({
      id: li.id,
      description: li.description,
      quantity: li.quantity,
      unit_price: money(li.unitPriceCents),
      total: money(li.totalCents),
      line_type: li.lineType,
    })),
    subtotal: money(inv.subtotalCents),
    tax_amount: money(inv.taxAmountCents),
    tax_rate: inv.taxRate,
    total: money(inv.totalCents),
    issued_at: inv.issuedAt?.toISOString() ?? '',
    due_at: inv.dueAt?.toISOString() ?? '',
    paid_at: inv.paidAt?.toISOString() ?? '',
    notes: inv.notes ?? '',
    created_at: inv.createdAt.toISOString(),
    updated_at: inv.updatedAt.toISOString(),
  };
}

function handleError(err: unknown, callback: GrpcCallback): void {
  if (err instanceof NotFoundError) {
    callback({ code: grpc.status.NOT_FOUND, message: err.message } as grpc.ServiceError);
  } else if (err instanceof ValidationError) {
    callback({ code: grpc.status.INVALID_ARGUMENT, message: err.message } as grpc.ServiceError);
  } else {
    callback({ code: grpc.status.INTERNAL, message: err instanceof Error ? err.message : 'Internal error' } as grpc.ServiceError);
  }
}

export class BillingGrpcHandler {
  constructor(
    private readonly createInvoiceUC: CreateInvoiceUseCase,
    private readonly getInvoiceUC: GetInvoiceUseCase,
    private readonly listInvoicesUC: ListInvoicesUseCase,
    private readonly updateInvoiceStatusUC: UpdateInvoiceStatusUseCase,
    private readonly getInvoicesByCustomerUC: GetInvoicesByCustomerUseCase,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createInvoice = async (call: any, callback: GrpcCallback): Promise<void> => {
    try {
      const req = call.request;
      const invoice = await this.createInvoiceUC.execute({
        workOrderId: req.work_order_id,
        customerId: req.customer_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lineItems: (req.line_items ?? []).map((li: any) => ({
          description: li.description,
          quantity: li.quantity,
          unitPriceCents: li.unit_price?.amount_cents ?? 0,
          totalCents: li.total?.amount_cents ?? 0,
          lineType: li.line_type === 'labor' ? 'labor' : 'part',
        })),
        taxRate: req.tax_rate,
        notes: req.notes,
      });
      callback(null, toProtoInvoice(invoice));
    } catch (err) {
      handleError(err, callback);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getInvoice = async (call: any, callback: GrpcCallback): Promise<void> => {
    try {
      const id = call.request['id'] as string;
      if (!id || !mongoose.isValidObjectId(id)) {
        return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'A valid invoice id is required' } as grpc.ServiceError);
      }
      const invoice = await this.getInvoiceUC.execute(id);
      callback(null, toProtoInvoice(invoice));
    } catch (err) {
      handleError(err, callback);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listInvoices = async (call: any, callback: GrpcCallback): Promise<void> => {
    try {
      const req = call.request;
      const result = await this.listInvoicesUC.execute({
        page: req.pagination?.page ?? 1,
        pageSize: req.pagination?.page_size ?? 20,
        statusFilterProto: req.status_filter,
      });
      const totalPages = Math.ceil(result.totalCount / result.pageSize);
      callback(null, {
        invoices: result.invoices.map(toProtoInvoice),
        pagination: { total_count: result.totalCount, page: result.page, page_size: result.pageSize, total_pages: totalPages },
      });
    } catch (err) {
      handleError(err, callback);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateInvoiceStatus = async (call: any, callback: GrpcCallback): Promise<void> => {
    try {
      const req = call.request as { id: string; new_status: number };
      if (!req.id || !mongoose.isValidObjectId(req.id)) {
        return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'A valid invoice id is required' } as grpc.ServiceError);
      }
      const invoice = await this.updateInvoiceStatusUC.execute(req.id, req.new_status);
      callback(null, toProtoInvoice(invoice));
    } catch (err) {
      handleError(err, callback);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getInvoicesByCustomer = async (call: any, callback: GrpcCallback): Promise<void> => {
    try {
      const req = call.request;
      const result = await this.getInvoicesByCustomerUC.execute({
        customerId: req.customer_id,
        page: req.pagination?.page ?? 1,
        pageSize: req.pagination?.page_size ?? 20,
      });
      const totalPages = Math.ceil(result.totalCount / result.pageSize);
      callback(null, {
        invoices: result.invoices.map(toProtoInvoice),
        pagination: { total_count: result.totalCount, page: result.page, page_size: result.pageSize, total_pages: totalPages },
      });
    } catch (err) {
      handleError(err, callback);
    }
  };
}
