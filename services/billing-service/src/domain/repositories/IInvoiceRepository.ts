import { InvoiceEntity, InvoiceStatus, CreateInvoiceInput } from '../entities/Invoice';

export interface ListInvoicesParams {
  page: number;
  pageSize: number;
  statusFilter?: InvoiceStatus;
}

export interface ListInvoicesResult {
  invoices: InvoiceEntity[];
  totalCount: number;
}

export interface IInvoiceRepository {
  create(data: CreateInvoiceInput & {
    invoiceNumber: string;
    subtotalCents: number;
    taxAmountCents: number;
    totalCents: number;
    issuedAt: Date;
    dueAt: Date;
  }): Promise<InvoiceEntity>;
  findById(id: string): Promise<InvoiceEntity | null>;
  findMany(params: ListInvoicesParams): Promise<ListInvoicesResult>;
  findByCustomerId(customerId: string, params: { page: number; pageSize: number }): Promise<ListInvoicesResult>;
  updateStatus(id: string, status: InvoiceStatus): Promise<InvoiceEntity>;
}
