import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({ currencyRate: { findFirst: vi.fn(), upsert: vi.fn() } }));
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
const { convertCurrency } = await import('../services/currencyService.js');

describe('currency conversion', () => {
  beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-25T12:00:00Z').getTime()); prismaMock.currencyRate.findFirst.mockReset(); prismaMock.currencyRate.upsert.mockReset(); });
  afterEach(() => vi.restoreAllMocks());
  it('converts with a fresh provider rate and caches it', async () => {
    prismaMock.currencyRate.findFirst.mockResolvedValueOnce(null);
    prismaMock.currencyRate.upsert.mockResolvedValue({ rate: 1.5, rateDate: new Date('2026-08-25'), estimated: false });
    const provider = { getRate: vi.fn().mockResolvedValue({ rate: 1.5, rateDate: new Date('2026-08-25'), provider: 'test' }) };
    const result = await convertCurrency({ amount: 20, sourceCurrency: 'USD', targetCurrency: 'AUD', date: new Date('2026-08-25'), provider });
    expect(result).toMatchObject({ convertedAmount: 30, exchangeRate: 1.5, estimated: false });
    expect(prismaMock.currencyRate.upsert).toHaveBeenCalled();
  });
  it('uses a cached rate when the provider fails', async () => {
    prismaMock.currencyRate.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ rate: 0.011, rateDate: new Date(), estimated: false });
    const provider = { getRate: vi.fn().mockRejectedValue(new Error('offline')) };
    const result = await convertCurrency({ amount: 50000, sourceCurrency: 'NPR', targetCurrency: 'AUD', provider });
    expect(result.convertedAmount).toBe(550);
  });
});
