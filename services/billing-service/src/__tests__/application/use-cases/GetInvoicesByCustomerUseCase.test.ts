import { GetInvoicesByCustomerUseCase } from '../../../application/use-cases/GetInvoicesByCustomerUseCase';
import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import { ValidationError } from '../../../domain/errors';
import { InvoiceEntity } from '../../../domain/entities/Invoice';

describe('GetInvoicesByCustomerUseCase', () => {
  let mockRepo: jest.Mocked<IInvoiceRepository>;
  let useCase: GetInvoicesByCustomerUseCase;

  const mockInvoice: InvoiceEntity = {
    id: 'inv-1', invoiceNumber: 'INV-2026-00001', workOrderId: 'wo-1', customerId: 'cust-1',
    status: 'draft', lineItems: [], subtotalCents: 0, taxRate: 0.21, taxAmountCents: 0, totalCents: 0,
    issuedAt: null, dueAt: null, paidAt: null, notes: '', createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findMany: jest.fn(), findByCustomerId: jest.fn(), updateStatus: jest.fn() };
    useCase = new GetInvoicesByCustomerUseCase(mockRepo);
  });

  it('returns invoices for the given customer', async () => {
    mockRepo.findByCustomerId.mockResolvedValue({ invoices: [mockInvoice], totalCount: 1 });

    const result = await useCase.execute({ customerId: 'cust-1', page: 1, pageSize: 20 });

    expect(result.invoices).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(mockRepo.findByCustomerId).toHaveBeenCalledWith('cust-1', { page: 1, pageSize: 20 });
  });

  it('throws ValidationError when customerId is missing', async () => {
    await expect(useCase.execute({ customerId: '', page: 1, pageSize: 20 }))
      .rejects.toThrow(ValidationError);
    expect(mockRepo.findByCustomerId).not.toHaveBeenCalled();
  });

  it('enforces minimum page of 1 and maximum pageSize of 100', async () => {
    mockRepo.findByCustomerId.mockResolvedValue({ invoices: [], totalCount: 0 });

    const result = await useCase.execute({ customerId: 'cust-1', page: 0, pageSize: 200 });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(100);
  });
});
