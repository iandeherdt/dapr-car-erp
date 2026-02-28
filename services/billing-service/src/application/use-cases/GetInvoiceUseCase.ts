import { IInvoiceRepository } from '../../domain/repositories/IInvoiceRepository';
import { InvoiceEntity } from '../../domain/entities/Invoice';
import { NotFoundError } from '../../domain/errors';

export class GetInvoiceUseCase {
  constructor(private readonly invoiceRepo: IInvoiceRepository) {}

  async execute(id: string): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new NotFoundError(`Invoice not found: ${id}`);
    return invoice;
  }
}
