import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

export class CurrencyRateProvider {
  async getRate() { throw new Error('Currency provider does not implement getRate'); }
}

export class FrankfurterRateProvider extends CurrencyRateProvider {
  async getRate(sourceCurrency, targetCurrency, date = new Date()) {
    const day = date.toISOString().slice(0, 10);
    const response = await fetch(`${env.CURRENCY_API_URL}/${day}?from=${sourceCurrency}&to=${targetCurrency}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Exchange-rate provider rejected the request');
    const data = await response.json();
    const rate = Number(data.rates?.[targetCurrency]);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Exchange-rate response was invalid');
    return { rate, rateDate: new Date(`${data.date || day}T00:00:00Z`), provider: 'frankfurter' };
  }
}

export async function convertCurrency({ amount, sourceCurrency, targetCurrency, date = new Date(), provider = new FrankfurterRateProvider() }) {
  const source = iso(sourceCurrency); const target = iso(targetCurrency); const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) throw new AppError(400, 'INVALID_CURRENCY_AMOUNT', 'Currency amount is invalid');
  if (source === target) return { originalAmount: numericAmount, sourceCurrency: source, targetCurrency: target, exchangeRate: 1, convertedAmount: numericAmount, rateDate: date, estimated: false };
  const start = new Date(date); start.setUTCDate(start.getUTCDate() - 7);
  let cached = await prisma.currencyRate.findFirst({ where: { sourceCurrency: source, targetCurrency: target, rateDate: { gte: start } }, orderBy: { rateDate: 'desc' } });
  if (!cached) {
    try {
      const fresh = await provider.getRate(source, target, date);
      cached = await prisma.currencyRate.upsert({
        where: { sourceCurrency_targetCurrency_rateDate: { sourceCurrency: source, targetCurrency: target, rateDate: fresh.rateDate } },
        create: { sourceCurrency: source, targetCurrency: target, rate: fresh.rate, rateDate: fresh.rateDate, provider: fresh.provider, estimated: false },
        update: { rate: fresh.rate, provider: fresh.provider, estimated: false },
      });
    } catch {
      cached = await prisma.currencyRate.findFirst({ where: { sourceCurrency: source, targetCurrency: target }, orderBy: { rateDate: 'desc' } });
      if (!cached) throw new AppError(503, 'CURRENCY_RATE_UNAVAILABLE', 'Currency conversion is temporarily unavailable and no cached rate exists');
    }
  }
  const rate = Number(cached.rate);
  const stale = Date.now() - new Date(cached.rateDate).getTime() > 7 * 86400000;
  return { originalAmount: numericAmount, sourceCurrency: source, targetCurrency: target, exchangeRate: rate, convertedAmount: Number((numericAmount * rate).toFixed(2)), rateDate: cached.rateDate, estimated: Boolean(cached.estimated || stale) };
}

function iso(value) {
  const currency = String(value || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new AppError(400, 'INVALID_CURRENCY', 'Currency must use a three-letter ISO code');
  return currency;
}
