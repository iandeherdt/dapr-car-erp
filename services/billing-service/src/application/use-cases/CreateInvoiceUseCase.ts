import { IInvoiceRepository } from '../../domain/repositories/IInvoiceRepository';
import { IEventPublisher } from '../../domain/events/IEventPublisher';
import { InvoiceEntity, CreateInvoiceInput, computeTotals } from '../../domain/entities/Invoice';
import { ValidationError } from '../../domain/errors';

export interface CreateInvoiceDeps {
  invoiceRepo: IInvoiceRepository;
  eventPublisher: IEventPublisher;
  getInvoiceNumber: () => Promise<string>;
}

export class CreateInvoiceUseCase {
  constructor(private readonly deps: CreateInvoiceDeps) {}

  async execute(input: CreateInvoiceInput): Promise<InvoiceEntity> {
    if (!input.workOrderId) throw new ValidationError('work_order_id is required');
    if (!input.customerId) throw new ValidationError('customer_id is required');

    const taxRate = (input.taxRate !== undefined && input.taxRate > 0) ? input.taxRate : 0.21;
    const { subtotalCents, taxAmountCents, totalCents } = computeTotals(input.lineItems, taxRate);
    const invoiceNumber = await this.deps.getInvoiceNumber();

    const now = new Date();
    const dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() + 30);

    const invoice = await this.deps.invoiceRepo.create({
      ...input,
      taxRate,
      invoiceNumber,
      subtotalCents,
      taxAmountCents,
      totalCents,
      issuedAt: now,
      dueAt,
    });

    await this.deps.eventPublisher.publish('invoice.created', {
      invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      work_order_id: invoice.workOrderId,
      customer_id: invoice.customerId,
      total_cents: invoice.totalCents,
      currency: 'EUR',
    }).catch(() => {});

    return invoice;
  }
}
