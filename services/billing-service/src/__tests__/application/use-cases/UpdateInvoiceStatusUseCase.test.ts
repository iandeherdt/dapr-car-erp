import { UpdateInvoiceStatusUseCase } from '../../../application/use-cases/UpdateInvoiceStatusUseCase';
import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import { IEventPublisher } from '../../../domain/events/IEventPublisher';
import { NotFoundError, ValidationError } from '../../../domain/errors';
import { InvoiceEntity } from '../../../domain/entities/Invoice';

describe('UpdateInvoiceStatusUseCase', () => {
  let mockRepo: jest.Mocked<IInvoiceRepository>;
  let mockPublisher: jest.Mocked<IEventPublisher>;
  let useCase: UpdateInvoiceStatusUseCase;

  const draftInvoice: InvoiceEntity = {
    id: 'inv-1', invoiceNumber: 'INV-2026-00001', workOrderId: 'wo-1', customerId: 'cust-1',
    status: 'draft', lineItems: [], subtotalCents: 5000, taxRate: 0.21, taxAmountCents: 1050, totalCents: 6050,
    issuedAt: null, dueAt: null, paidAt: null, notes: '', createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findMany: jest.fn(), findByCustomerId: jest.fn(), updateStatus: jest.fn() };
    mockPublisher = { publish: jest.fn() };
    useCase = new UpdateInvoiceStatusUseCase(mockRepo, mockPublisher);
  });

  it('transitions status and publishes invoice.paid when transitioning to paid', async () => {
    mockRepo.findById.mockResolvedValue(draftInvoice);
    mockRepo.updateStatus.mockResolvedValue({ ...draftInvoice, status: 'paid', paidAt: new Date() });
    mockPublisher.publish.mockResolvedValue(undefined);

    await useCase.execute('inv-1', 3); // 3 = paid

    expect(mockRepo.updateStatus).toHaveBeenCalledWith('inv-1', 'paid');
    expect(mockPublisher.publish).toHaveBeenCalledWith('invoice.paid', expect.objectContaining({ invoice_id: 'inv-1' }));
  });

  it('does NOT publish invoice.paid when status was already paid', async () => {
    const paidInvoice = { ...draftInvoice, status: 'paid' as const, paidAt: new Date() };
    mockRepo.findById.mockResolvedValue(paidInvoice);
    mockRepo.updateStatus.mockResolvedValue(paidInvoice);
    mockPublisher.publish.mockResolvedValue(undefined);

    await useCase.execute('inv-1', 3);

    expect(mockPublisher.publish).not.toHaveBeenCalled();
  });

  it('throws ValidationError for unknown status', async () => {
    await expect(useCase.execute('inv-1', 99)).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError when invoice does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('inv-missing', 2)).rejects.toThrow(NotFoundError);
  });
});
