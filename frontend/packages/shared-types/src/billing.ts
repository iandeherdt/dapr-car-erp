import type { Money } from './common';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
  lineType: 'part' | 'labor';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  workOrderId: string;
  customerId: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: Money;
  taxAmount: Money;
  taxRate: number;
  total: Money;
  issuedAt: string;
  dueAt: string;
  paidAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
