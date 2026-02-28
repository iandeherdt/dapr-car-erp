import { IInvoiceRepository, ListInvoicesResult } from '../../domain/repositories/IInvoiceRepository';
import { ValidationError } from '../../domain/errors';

export class GetInvoicesByCustomerUseCase {
  constructor(private readonly invoiceRepo: IInvoiceRepository) {}

  async execute(params: {
    customerId: string;
    page: number;
    pageSize: number;
  }): Promise<ListInvoicesResult & { page: number; pageSize: number }> {
    if (!params.customerId) throw new ValidationError('customer_id is required');
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const result = await this.invoiceRepo.findByCustomerId(params.customerId, { page, pageSize });
    return { ...result, page, pageSize };
  }
}
