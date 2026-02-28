import type { IBillingService } from '../../application/services/IBillingService.js';
import * as client from '../../clients/billing-client.js';

export class GrpcBillingService implements IBillingService {
  createInvoice(data: client.CreateInvoiceRequest, correlationId?: string): Promise<client.Invoice> {
    return client.createInvoice(data, correlationId);
  }

  getInvoice(id: string, correlationId?: string): Promise<client.Invoice> {
    return client.getInvoice(id, correlationId);
  }

  listInvoices(
    pagination: client.Pagination,
    statusFilter?: client.InvoiceStatus,
    correlationId?: string,
  ): Promise<client.ListInvoicesResponse> {
    return client.listInvoices(pagination, statusFilter, correlationId);
  }

  updateInvoiceStatus(
    data: client.UpdateInvoiceStatusRequest,
    correlationId?: string,
  ): Promise<client.Invoice> {
    return client.updateInvoiceStatus(data, correlationId);
  }

  getInvoicesByCustomer(
    customerId: string,
    pagination: client.Pagination,
    correlationId?: string,
  ): Promise<client.ListInvoicesResponse> {
    return client.getInvoicesByCustomer(customerId, pagination, correlationId);
  }
}
