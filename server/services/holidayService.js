import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

export class HolidayProvider {
  async getHolidays() { throw new Error('Holiday provider does not implement getHolidays'); }
}

export class NagerHolidayProvider extends HolidayProvider {
  async getHolidays(countryCode, year) {
    const response = await fetch(`${env.HOLIDAY_API_URL}/PublicHolidays/${year}/${countryCode}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Holiday provider rejected the request');
    return (await response.json()).map((item) => ({ name: item.localName || item.name, date: new Date(`${item.date}T00:00:00Z`) }));
  }
}

export async function holidaysFor(countryCode, year, provider = new NagerHolidayProvider()) {
  const country = String(countryCode || 'AU').toUpperCase();
  const start = new Date(Date.UTC(year, 0, 1)); const end = new Date(Date.UTC(year + 1, 0, 1));
  let cached = await prisma.holidayCache.findMany({ where: { countryCode: country, holidayDate: { gte: start, lt: end } }, orderBy: { holidayDate: 'asc' } });
  const freshEnough = cached.length && Date.now() - new Date(cached[0].fetchedAt).getTime() < 30 * 86400000;
  if (freshEnough) return cached;
  try {
    const holidays = await provider.getHolidays(country, year);
    for (const holiday of holidays) {
      await prisma.holidayCache.upsert({
        where: { countryCode_holidayDate_name: { countryCode: country, holidayDate: holiday.date, name: holiday.name } },
        create: { countryCode: country, holidayDate: holiday.date, name: holiday.name, provider: 'nager' },
        update: { fetchedAt: new Date(), provider: 'nager' },
      });
    }
    cached = await prisma.holidayCache.findMany({ where: { countryCode: country, holidayDate: { gte: start, lt: end } }, orderBy: { holidayDate: 'asc' } });
  } catch { /* cached data remains usable */ }
  return cached;
}

export function forecastPayday(expectedDate, holidays, behaviour = null) {
  const expected = new Date(expectedDate);
  const holiday = holidays.find((item) => dateKey(item.holidayDate || item.date) === dateKey(expected));
  if (!holiday) return { expectedDate: expected, forecastDate: expected, holiday: null, requiresConfirmation: false, behaviour: 'SAME_DATE' };
  if (!behaviour || behaviour === 'MANUAL') return { expectedDate: expected, forecastDate: expected, holiday: holiday.name, requiresConfirmation: true, behaviour: behaviour || null };
  const forecast = new Date(expected);
  if (behaviour === 'PREVIOUS_BUSINESS_DAY') moveBusinessDay(forecast, -1, holidays);
  if (behaviour === 'NEXT_BUSINESS_DAY') moveBusinessDay(forecast, 1, holidays);
  return { expectedDate: expected, forecastDate: forecast, holiday: holiday.name, requiresConfirmation: false, behaviour };
}

function moveBusinessDay(date, step, holidays) {
  do { date.setUTCDate(date.getUTCDate() + step); }
  while ([0, 6].includes(date.getUTCDay()) || holidays.some((item) => dateKey(item.holidayDate || item.date) === dateKey(date)));
}
function dateKey(value) { return new Date(value).toISOString().slice(0, 10); }
