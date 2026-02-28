export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface LineItemEntity {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  lineType: 'part' | 'labor';
}

export interface InvoiceEntity {
  id: string;
  invoiceNumber: string;
  workOrderId: string;
  customerId: string;
  status: InvoiceStatus;
  lineItems: LineItemEntity[];
  subtotalCents: number;
  taxRate: number;
  taxAmountCents: number;
  totalCents: number;
  issuedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceInput {
  workOrderId: string;
  customerId: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    lineType: 'part' | 'labor';
  }>;
  taxRate?: number;
  notes?: string;
}

export function computeTotals(
  lineItems: Array<{ totalCents: number }>,
  taxRate: number
): { subtotalCents: number; taxAmountCents: number; totalCents: number } {
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
  const taxAmountCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxAmountCents;
  return { subtotalCents, taxAmountCents, totalCents };
}
