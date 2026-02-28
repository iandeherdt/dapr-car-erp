import { IInvoiceRepository } from '../../domain/repositories/IInvoiceRepository';
import { IEventPublisher } from '../../domain/events/IEventPublisher';
import { InvoiceEntity, InvoiceStatus } from '../../domain/entities/Invoice';
import { NotFoundError, ValidationError } from '../../domain/errors';

const PROTO_TO_STATUS: Record<number, InvoiceStatus> = {
  1: 'draft',
  2: 'sent',
  3: 'paid',
  4: 'overdue',
  5: 'cancelled',
};

export class UpdateInvoiceStatusUseCase {
  constructor(
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(id: string, newStatusProto: number): Promise<InvoiceEntity> {
    const newStatus = PROTO_TO_STATUS[newStatusProto];
    if (!newStatus) throw new ValidationError(`Unknown status value: ${newStatusProto}`);

    const existing = await this.invoiceRepo.findById(id);
    if (!existing) throw new NotFoundError(`Invoice not found: ${id}`);

    const previousStatus = existing.status;
    const invoice = await this.invoiceRepo.updateStatus(id, newStatus);

    if (newStatus === 'paid' && previousStatus !== 'paid') {
      await this.eventPublisher.publish('invoice.paid', {
        invoice_id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        work_order_id: invoice.workOrderId,
        customer_id: invoice.customerId,
        total_cents: invoice.totalCents,
        currency: 'EUR',
        paid_at: invoice.paidAt?.toISOString(),
      }).catch(() => {});
    }

    return invoice;
  }
}
