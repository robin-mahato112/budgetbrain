import { performance } from 'node:perf_hooks';
import { occurrenceDates } from '../services/scheduleService.js';

const iterations = 2000;
const anchor = new Date('1900-01-01'); const from = new Date('2026-08-25'); const until = new Date('2026-09-04');
function replay() {
  const due = new Date(anchor); const result = [];
  while (due < from) due.setUTCDate(due.getUTCDate() + 7);
  while (due <= until) { result.push(new Date(due)); due.setUTCDate(due.getUTCDate() + 7); }
  return result;
}
function measure(fn) { const start = performance.now(); let count = 0; for (let i = 0; i < iterations; i += 1) count += fn().length; return { milliseconds: Number((performance.now() - start).toFixed(2)), occurrences: count }; }
const baseline = measure(replay);
const current = measure(() => occurrenceDates(anchor, 'WEEKLY', from, until));
if (baseline.occurrences !== current.occurrences) throw new Error('Benchmark produced inconsistent occurrence counts');
console.log(JSON.stringify({ workload: '2,000 old weekly schedules, 10-day window', baseline, current }, null, 2));
