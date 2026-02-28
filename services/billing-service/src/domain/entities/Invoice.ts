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

const VALID_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft:     ['sent', 'cancelled'],
  sent:      ['paid', 'overdue', 'cancelled'],
  overdue:   ['paid', 'cancelled'],
  paid:      [],
  cancelled: [],
};

export class Invoice {
  /**
   * Returns the subtotal, tax amount, and total for a set of line items.
   */
  static computeTotals(
    lineItems: Array<{ totalCents: number }>,
    taxRate: number,
  ): { subtotalCents: number; taxAmountCents: number; totalCents: number } {
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
    const taxAmountCents = Math.round(subtotalCents * taxRate);
    const totalCents = subtotalCents + taxAmountCents;
    return { subtotalCents, taxAmountCents, totalCents };
  }

  /**
   * Returns true when transitioning from currentStatus to newStatus is a valid
   * state machine move. Terminal states (paid, cancelled) accept no transitions.
   */
  static canTransitionTo(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): boolean {
    return (VALID_TRANSITIONS[currentStatus] as InvoiceStatus[]).includes(newStatus);
  }
}
