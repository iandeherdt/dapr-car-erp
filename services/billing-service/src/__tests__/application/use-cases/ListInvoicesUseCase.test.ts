import { ListInvoicesUseCase } from '../../../application/use-cases/ListInvoicesUseCase';
import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import { InvoiceEntity } from '../../../domain/entities/Invoice';

describe('ListInvoicesUseCase', () => {
  let mockRepo: jest.Mocked<IInvoiceRepository>;
  let useCase: ListInvoicesUseCase;

  const mockInvoice: InvoiceEntity = {
    id: 'inv-1', invoiceNumber: 'INV-2026-00001', workOrderId: 'wo-1', customerId: 'cust-1',
    status: 'draft', lineItems: [], subtotalCents: 0, taxRate: 0.21, taxAmountCents: 0, totalCents: 0,
    issuedAt: null, dueAt: null, paidAt: null, notes: '', createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findMany: jest.fn(), findByCustomerId: jest.fn(), updateStatus: jest.fn() };
    useCase = new ListInvoicesUseCase(mockRepo);
  });

  it('returns invoices with pagination info', async () => {
    mockRepo.findMany.mockResolvedValue({ invoices: [mockInvoice], totalCount: 1 });

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(result.invoices).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('enforces minimum page of 1', async () => {
    mockRepo.findMany.mockResolvedValue({ invoices: [], totalCount: 0 });

    const result = await useCase.execute({ page: 0, pageSize: 20 });

    expect(result.page).toBe(1);
    expect(mockRepo.findMany).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('enforces maximum pageSize of 100', async () => {
    mockRepo.findMany.mockResolvedValue({ invoices: [], totalCount: 0 });

    const result = await useCase.execute({ page: 1, pageSize: 500 });

    expect(result.pageSize).toBe(100);
    expect(mockRepo.findMany).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 100 }));
  });

  it('maps proto status filter to string', async () => {
    mockRepo.findMany.mockResolvedValue({ invoices: [], totalCount: 0 });

    await useCase.execute({ page: 1, pageSize: 20, statusFilterProto: 1 });

    expect(mockRepo.findMany).toHaveBeenCalledWith(expect.objectContaining({ statusFilter: 'draft' }));
  });
});
