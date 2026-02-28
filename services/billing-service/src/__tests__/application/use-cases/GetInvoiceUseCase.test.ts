import { GetInvoiceUseCase } from '../../../application/use-cases/GetInvoiceUseCase';
import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import { NotFoundError } from '../../../domain/errors';
import { InvoiceEntity } from '../../../domain/entities/Invoice';

describe('GetInvoiceUseCase', () => {
  let mockRepo: jest.Mocked<IInvoiceRepository>;
  let useCase: GetInvoiceUseCase;

  const mockInvoice: InvoiceEntity = {
    id: 'inv-1', invoiceNumber: 'INV-2026-00001', workOrderId: 'wo-1', customerId: 'cust-1',
    status: 'draft', lineItems: [], subtotalCents: 0, taxRate: 0.21, taxAmountCents: 0, totalCents: 0,
    issuedAt: null, dueAt: null, paidAt: null, notes: '', createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findMany: jest.fn(), findByCustomerId: jest.fn(), updateStatus: jest.fn() };
    useCase = new GetInvoiceUseCase(mockRepo);
  });

  it('returns invoice when found', async () => {
    mockRepo.findById.mockResolvedValue(mockInvoice);
    const result = await useCase.execute('inv-1');
    expect(result).toEqual(mockInvoice);
  });

  it('throws NotFoundError when invoice does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('inv-missing')).rejects.toThrow(NotFoundError);
  });
});
