import { useEffect, useState } from 'react';
import { CalendarDays, Save, Upload } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import PageContainer from '../components/layout/PageContainer';
import { useFinance } from '../hooks/useFinance';
import { budgetService } from '../services/budgetService';

export default function PaydaySetup() {
  const { refreshTransactions } = useFinance();
  const [form, setForm] = useState({ balance: '', payday: '', payAmount: '', safetyBuffer: '0', frequency: 'weekly', confidence: 'confirmed' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('');
  const [forecast, setForecast] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    budgetService.getPayday?.().then((data) => {
      if (!data?.nextPayday && !data?.expectedDate) return;
      setForm({
        balance: String(data.currentBalance ?? ''), payday: String(data.nextPayday || data.expectedDate || '').slice(0, 10),
        payAmount: String(data.expectedIncome ?? ''), safetyBuffer: String(data.safetyBuffer ?? 0),
        frequency: String(data.incomeFrequency || 'WEEKLY').toLowerCase(), confidence: data.paydayConfirmed ? 'confirmed' : 'expected',
      });
      setForecast(data);
    }).catch(() => {});
  }, []);

  const save = async (event) => {
    event.preventDefault();
    const amount = Number(form.payAmount || 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.payday) || form.balance === '') {
      setStatus('Enter a balance and choose your next payday. Expected pay is not recorded as received income.');
      return;
    }
      if (saving) return;
      setSaving(true);
      try {
        const nextForecast = await budgetService.savePayday({
          currentBalance: Number(form.balance), nextPayday: form.payday, paydayConfirmed: form.confidence === 'confirmed',
          expectedIncome: amount, incomeFrequency: form.frequency.toUpperCase(), safetyBuffer: Number(form.safetyBuffer || 0),
          holidayPaydayRule: forecast?.behaviour || null,
        });
        setForecast(nextForecast);
        await refreshTransactions();
        if (nextForecast.requiresConfirmation) {
          setStatus(`Your payday falls on ${nextForecast.holiday}. Confirm how your employer handles public holidays.`);
          return;
        }
      } catch (error) {
        setStatus(error.response?.data?.message || 'Payday details could not be saved.');
        return;
      } finally { setSaving(false); }
    setStatus('Payday setup saved. Your current balance and protected costs now update the dashboard.');
  };

  const uploadPayslip = async (event) => {
    event.preventDefault();
    if (!file) return;
    const result = await budgetService.uploadDocument({ file, kind: 'payslip' });
    setPreview(result);
    setStatus(result.extractionMessage || 'Payslip preview ready. Review before saving.');
  };

  return (
    <PageContainer eyebrow="Payday" title="Payday Setup" description="Set the basics BudgetBrain needs before it can calculate safe-to-spend money.">
      <div className="settings-grid settings-grid--wide">
        <Card className="settings-card">
          <CalendarDays size={22} />
          <div><h2>Payday basics</h2><p>Keep this short: balance, next payday, expected pay, frequency, and confidence.</p></div>
          <form className="settings-form" onSubmit={save}>
            <Input label="Current balance" required type="number" step="0.01" value={form.balance} onChange={(event) => setForm((current) => ({ ...current, balance: event.target.value }))} placeholder="900" />
            <Input label="Next payday" required type="date" value={form.payday} onChange={(event) => setForm((current) => ({ ...current, payday: event.target.value }))} />
            <small>Enter today's available balance. Expected pay is kept separate until it arrives.</small>
            {forecast?.requiresConfirmation && (
              <label>Your payday falls on {forecast.holiday}. When do you normally receive pay?
                <select value={forecast.behaviour || ''} onChange={(event) => setForecast((current) => ({ ...current, behaviour: event.target.value }))}>
                  <option value="">Choose one</option><option value="PREVIOUS_BUSINESS_DAY">Previous business day</option><option value="NEXT_BUSINESS_DAY">Next business day</option><option value="SAME_DATE">Same date</option><option value="MANUAL">I'll confirm manually</option>
                </select>
              </label>
            )}
            <Input label="Expected pay amount" type="number" step="0.01" value={form.payAmount} onChange={(event) => setForm((current) => ({ ...current, payAmount: event.target.value }))} placeholder="1400" />
            <Input label="Safety buffer" type="number" min="0" step="0.01" value={form.safetyBuffer} onChange={(event) => setForm((current) => ({ ...current, safetyBuffer: event.target.value }))} placeholder="100" />
            <label>Income frequency
              <select value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label>Income confidence
              <select value={form.confidence} onChange={(event) => setForm((current) => ({ ...current, confidence: event.target.value }))}>
                <option value="confirmed">Confirmed</option>
                <option value="expected">Expected</option>
                <option value="uncertain">Uncertain</option>
              </select>
            </label>
            <Button type="submit" icon={Save} disabled={saving}>{saving ? 'Saving…' : 'Save payday setup'}</Button>
          </form>
        </Card>

        <Card className="settings-card">
          <Upload size={22} />
          <div><h2>Upload payslip</h2><p>Upload, preview detected values, then confirm before anything is saved.</p></div>
          <form className="settings-form" onSubmit={uploadPayslip}>
            <label className="file-drop file-drop--compact">
              <strong>{file?.name || 'Choose payslip image or PDF'}</strong>
              <input type="file" accept=".png,.jpg,.jpeg,.pdf,.txt,image/png,image/jpeg,application/pdf,text/plain" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
            <Button type="submit" disabled={!file}>Preview payslip</Button>
          </form>
          {preview && <pre className="csv-example">{JSON.stringify(preview.extractedData, null, 2)}</pre>}
        </Card>
      </div>
      {status && <p className="status-message" role="status">{status}</p>}
    </PageContainer>
  );
}
