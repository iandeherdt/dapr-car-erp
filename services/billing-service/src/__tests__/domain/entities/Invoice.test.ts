import { computeTotals } from '../../../domain/entities/Invoice';

describe('computeTotals', () => {
  it('computes subtotal, tax, and total', () => {
    const lineItems = [
      { totalCents: 10000 },
      { totalCents: 5000 },
    ];
    const result = computeTotals(lineItems, 0.21);
    expect(result.subtotalCents).toBe(15000);
    expect(result.taxAmountCents).toBe(3150);
    expect(result.totalCents).toBe(18150);
  });

  it('returns zeros for empty line items', () => {
    const result = computeTotals([], 0.21);
    expect(result.subtotalCents).toBe(0);
    expect(result.taxAmountCents).toBe(0);
    expect(result.totalCents).toBe(0);
  });

  it('rounds tax to nearest cent', () => {
    const lineItems = [{ totalCents: 100 }];
    const result = computeTotals(lineItems, 0.21);
    expect(result.taxAmountCents).toBe(21);
    expect(result.totalCents).toBe(121);
  });
});
