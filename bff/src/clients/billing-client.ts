import { createServiceClient } from './grpc-client.js';

const PROTO_PATH = 'billing/v1/billing.proto';
const PACKAGE_NAME = 'billing.v1';
const SERVICE_NAME = 'BillingService';
const DAPR_APP_ID = 'billing-service';

function getClient() {
  return createServiceClient(PROTO_PATH, PACKAGE_NAME, SERVICE_NAME, DAPR_APP_ID);
}

// ---- Type definitions ----

export interface Money {
  amountCents: string;
  currency: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PaginationResult {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type InvoiceStatus =
  | 'INVOICE_STATUS_UNSPECIFIED'
  | 'INVOICE_STATUS_DRAFT'
  | 'INVOICE_STATUS_SENT'
  | 'INVOICE_STATUS_PAID'
  | 'INVOICE_STATUS_OVERDUE'
  | 'INVOICE_STATUS_CANCELLED';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
  lineType: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  workOrderId: string;
  customerId: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: Money;
  taxAmount: Money;
  taxRate: number;
  total: Money;
  issuedAt: string;
  dueAt: string;
  paidAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListInvoicesResponse {
  invoices: Invoice[];
  pagination: PaginationResult;
}

// ---- Request shapes ----

export interface CreateInvoiceRequest {
  workOrderId: string;
  customerId: string;
  lineItems: InvoiceLineItem[];
  taxRate?: number;
  notes?: string;
}

export interface UpdateInvoiceStatusRequest {
  id: string;
  newStatus: InvoiceStatus;
}

export interface GetInvoicesByCustomerRequest {
  customerId: string;
  pagination: Pagination;
}

// ---- Client methods ----

export async function createInvoice(data: CreateInvoiceRequest, correlationId?: string): Promise<Invoice> {
  return getClient().call<CreateInvoiceRequest, Invoice>('createInvoice', data, 10_000, correlationId);
}

export async function getInvoice(id: string, correlationId?: string): Promise<Invoice> {
  return getClient().call<{ id: string }, Invoice>('getInvoice', { id }, 10_000, correlationId);
}

export async function listInvoices(
  pagination: Pagination,
  statusFilter?: InvoiceStatus,
  correlationId?: string,
): Promise<ListInvoicesResponse> {
  return getClient().call<object, ListInvoicesResponse>('listInvoices', {
    pagination,
    statusFilter: statusFilter ?? 'INVOICE_STATUS_UNSPECIFIED',
  }, 10_000, correlationId);
}

export async function updateInvoiceStatus(
  data: UpdateInvoiceStatusRequest,
  correlationId?: string,
): Promise<Invoice> {
  return getClient().call<UpdateInvoiceStatusRequest, Invoice>('updateInvoiceStatus', data, 10_000, correlationId);
}

export async function getInvoicesByCustomer(
  customerId: string,
  pagination: Pagination,
  correlationId?: string,
): Promise<ListInvoicesResponse> {
  return getClient().call<GetInvoicesByCustomerRequest, ListInvoicesResponse>(
    'getInvoicesByCustomer',
    { customerId, pagination },
    10_000,
    correlationId,
  );
}
