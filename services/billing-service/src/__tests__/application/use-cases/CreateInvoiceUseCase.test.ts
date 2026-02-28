import { CreateInvoiceUseCase } from '../../../application/use-cases/CreateInvoiceUseCase';
import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import { IEventPublisher } from '../../../domain/events/IEventPublisher';
import { InvoiceEntity } from '../../../domain/entities/Invoice';

describe('CreateInvoiceUseCase', () => {
  let mockRepo: jest.Mocked<IInvoiceRepository>;
  let mockPublisher: jest.Mocked<IEventPublisher>;
  let mockGetInvoiceNumber: jest.Mock;
  let useCase: CreateInvoiceUseCase;

  const mockInvoice: InvoiceEntity = {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-00001',
    workOrderId: 'wo-1',
    customerId: 'cust-1',
    status: 'draft',
    lineItems: [],
    subtotalCents: 10000,
    taxRate: 0.21,
    taxAmountCents: 2100,
    totalCents: 12100,
    issuedAt: new Date(),
    dueAt: new Date(),
    paidAt: null,
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      findByCustomerId: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockPublisher = { publish: jest.fn() };
    mockGetInvoiceNumber = jest.fn().mockResolvedValue('INV-2026-00001');
    useCase = new CreateInvoiceUseCase({
      invoiceRepo: mockRepo,
      eventPublisher: mockPublisher,
      getInvoiceNumber: mockGetInvoiceNumber,
    });
  });

  it('creates invoice and publishes event', async () => {
    mockRepo.create.mockResolvedValue(mockInvoice);
    mockPublisher.publish.mockResolvedValue(undefined);

    await useCase.execute({
      workOrderId: 'wo-1',
      customerId: 'cust-1',
      lineItems: [{ description: 'Part', quantity: 1, unitPriceCents: 10000, totalCents: 10000, lineType: 'part' }],
    });

    expect(mockGetInvoiceNumber).toHaveBeenCalled();
    expect(mockRepo.create).toHaveBeenCalledTimes(1);
    expect(mockPublisher.publish).toHaveBeenCalledWith('invoice.created', expect.objectContaining({ invoice_id: 'inv-1' }));
  });

  it('throws ValidationError when workOrderId is missing', async () => {
    await expect(useCase.execute({ workOrderId: '', customerId: 'cust-1', lineItems: [] }))
      .rejects.toThrow('work_order_id is required');
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('uses default tax rate of 0.21 when not provided', async () => {
    mockRepo.create.mockResolvedValue(mockInvoice);
    mockPublisher.publish.mockResolvedValue(undefined);

    await useCase.execute({ workOrderId: 'wo-1', customerId: 'cust-1', lineItems: [] });

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ taxRate: 0.21 }));
  });
});
