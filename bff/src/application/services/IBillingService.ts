import type {
  Invoice,
  ListInvoicesResponse,
  CreateInvoiceRequest,
  UpdateInvoiceStatusRequest,
  InvoiceStatus,
  Pagination,
} from '../../clients/billing-client.js';

export interface IBillingService {
  createInvoice(data: CreateInvoiceRequest, correlationId?: string): Promise<Invoice>;
  getInvoice(id: string, correlationId?: string): Promise<Invoice>;
  listInvoices(pagination: Pagination, statusFilter?: InvoiceStatus, correlationId?: string): Promise<ListInvoicesResponse>;
  updateInvoiceStatus(data: UpdateInvoiceStatusRequest, correlationId?: string): Promise<Invoice>;
  getInvoicesByCustomer(
    customerId: string,
    pagination: Pagination,
    correlationId?: string,
  ): Promise<ListInvoicesResponse>;
}
