import Fastify, { FastifyInstance } from 'fastify';
import { billingRoutes } from '../../routes/billing';
import { schemas } from '../../schemas';
import type { IBillingService } from '../../application/services/IBillingService';
import type { Invoice, ListInvoicesResponse } from '../../clients/billing-client';
import { GrpcClientError } from '../../clients/grpc-client';
import * as grpc from '@grpc/grpc-js';

const INV_ID  = '66666666-6666-6666-6666-666666666666';
const CUST_ID = '11111111-1111-1111-1111-111111111111';

const mockMoney = { amountCents: '50000', currency: 'EUR' };

const mockInvoice: Invoice = {
  id: INV_ID,
  invoiceNumber: 'INV-2024-001',
  workOrderId: '33333333-3333-3333-3333-333333333333',
  customerId: CUST_ID,
  status: 'INVOICE_STATUS_DRAFT',
  lineItems: [],
  subtotal: mockMoney,
  taxAmount: mockMoney,
  taxRate: 0.21,
  total: mockMoney,
  issuedAt: '',
  dueAt: '',
  paidAt: '',
  notes: '',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockListResponse: ListInvoicesResponse = {
  invoices: [mockInvoice],
  pagination: { totalCount: 1, page: 1, pageSize: 20, totalPages: 1 },
};

function buildApp(service: Partial<IBillingService>): FastifyInstance {
  const app = Fastify({ logger: false, ajv: { customOptions: { strict: false } } });
  for (const schema of schemas) app.addSchema(schema);
  app.register(billingRoutes, { prefix: '/api', service: service as IBillingService });
  return app;
}

describe('Billing Routes', () => {
  describe('GET /api/invoices', () => {
    it('returns 200 with invoice list', async () => {
      const service: Partial<IBillingService> = {
        listInvoices: jest.fn().mockResolvedValue(mockListResponse),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: '/api/invoices' });

      expect(res.statusCode).toBe(200);
      expect(res.json().invoices).toHaveLength(1);
      expect(res.json().invoices[0].invoiceNumber).toBe('INV-2024-001');
    });

    it('passes status filter to service', async () => {
      const service: Partial<IBillingService> = {
        listInvoices: jest.fn().mockResolvedValue(mockListResponse),
      };
      const app = buildApp(service);

      // The route schema accepts normalized status values (e.g. 'draft', not proto enum strings)
      await app.inject({ method: 'GET', url: '/api/invoices?status=draft' });

      expect(service.listInvoices).toHaveBeenCalledWith(
        { page: 1, pageSize: 20 },
        'draft',
        undefined,
      );
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('returns 200 with invoice', async () => {
      const service: Partial<IBillingService> = {
        getInvoice: jest.fn().mockResolvedValue(mockInvoice),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: `/api/invoices/${INV_ID}` });

      expect(res.statusCode).toBe(200);
      expect(res.json().invoiceNumber).toBe('INV-2024-001');
    });

    it('returns 404 when invoice not found', async () => {
      const service: Partial<IBillingService> = {
        getInvoice: jest.fn().mockRejectedValue(new GrpcClientError('Not found', grpc.status.NOT_FOUND)),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: `/api/invoices/${INV_ID}` });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/invoices/:id/status', () => {
    it('returns 200 with updated invoice', async () => {
      const service: Partial<IBillingService> = {
        updateInvoiceStatus: jest.fn().mockResolvedValue({ ...mockInvoice, status: 'INVOICE_STATUS_SENT' }),
      };
      const app = buildApp(service);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/invoices/${INV_ID}/status`,
        payload: { status: 'sent' }, // route schema accepts normalized values
      });

      expect(res.statusCode).toBe(200);
      expect(service.updateInvoiceStatus).toHaveBeenCalledWith(
        { id: INV_ID, newStatus: 'sent' },
        undefined,
      );
    });
  });

  describe('GET /api/customers/:id/invoices', () => {
    it('returns 200 with customer invoices', async () => {
      const service: Partial<IBillingService> = {
        getInvoicesByCustomer: jest.fn().mockResolvedValue(mockListResponse),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: `/api/customers/${CUST_ID}/invoices` });

      expect(res.statusCode).toBe(200);
      expect(service.getInvoicesByCustomer).toHaveBeenCalledWith(
        CUST_ID,
        { page: 1, pageSize: 20 },
        undefined,
      );
    });
  });
});
