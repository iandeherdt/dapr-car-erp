import { Invoice } from '../../../domain/entities/Invoice';

describe('Invoice.computeTotals', () => {
  it('computes subtotal, tax, and total', () => {
    const result = Invoice.computeTotals([{ totalCents: 10000 }, { totalCents: 5000 }], 0.21);
    expect(result.subtotalCents).toBe(15000);
    expect(result.taxAmountCents).toBe(3150);
    expect(result.totalCents).toBe(18150);
  });

  it('returns zeros for empty line items', () => {
    const result = Invoice.computeTotals([], 0.21);
    expect(result.subtotalCents).toBe(0);
    expect(result.taxAmountCents).toBe(0);
    expect(result.totalCents).toBe(0);
  });

  it('rounds tax to nearest cent', () => {
    const result = Invoice.computeTotals([{ totalCents: 100 }], 0.21);
    expect(result.taxAmountCents).toBe(21);
    expect(result.totalCents).toBe(121);
  });
});

describe('Invoice.canTransitionTo', () => {
  it('allows draft → sent', () => {
    expect(Invoice.canTransitionTo('draft', 'sent')).toBe(true);
  });

  it('allows draft → cancelled', () => {
    expect(Invoice.canTransitionTo('draft', 'cancelled')).toBe(true);
  });

  it('disallows draft → paid (must go through sent first)', () => {
    expect(Invoice.canTransitionTo('draft', 'paid')).toBe(false);
  });

  it('allows sent → paid', () => {
    expect(Invoice.canTransitionTo('sent', 'paid')).toBe(true);
  });

  it('allows sent → overdue', () => {
    expect(Invoice.canTransitionTo('sent', 'overdue')).toBe(true);
  });

  it('allows overdue → paid', () => {
    expect(Invoice.canTransitionTo('overdue', 'paid')).toBe(true);
  });

  it('disallows paid → any (terminal state)', () => {
    expect(Invoice.canTransitionTo('paid', 'draft')).toBe(false);
    expect(Invoice.canTransitionTo('paid', 'sent')).toBe(false);
    expect(Invoice.canTransitionTo('paid', 'cancelled')).toBe(false);
  });

  it('disallows cancelled → any (terminal state)', () => {
    expect(Invoice.canTransitionTo('cancelled', 'draft')).toBe(false);
    expect(Invoice.canTransitionTo('cancelled', 'paid')).toBe(false);
  });
});
