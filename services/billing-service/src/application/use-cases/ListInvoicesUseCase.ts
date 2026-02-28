import { IInvoiceRepository, ListInvoicesResult } from '../../domain/repositories/IInvoiceRepository';
import { InvoiceStatus } from '../../domain/entities/Invoice';

const PROTO_TO_STATUS: Record<number, InvoiceStatus> = {
  1: 'draft',
  2: 'sent',
  3: 'paid',
  4: 'overdue',
  5: 'cancelled',
};

export class ListInvoicesUseCase {
  constructor(private readonly invoiceRepo: IInvoiceRepository) {}

  async execute(params: {
    page: number;
    pageSize: number;
    statusFilterProto?: number;
  }): Promise<ListInvoicesResult & { page: number; pageSize: number }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const statusFilter = params.statusFilterProto ? PROTO_TO_STATUS[params.statusFilterProto] : undefined;
    const result = await this.invoiceRepo.findMany({ page, pageSize, statusFilter });
    return { ...result, page, pageSize };
  }
}
