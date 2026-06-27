import { useState } from 'react';
import { CalendarDays, Save, Upload } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import PageContainer from '../components/layout/PageContainer';
import { useFinance } from '../hooks/useFinance';
import { budgetService } from '../services/budgetService';

export default function PaydaySetup() {
  const { addTransaction, refreshTransactions } = useFinance();
  const [form, setForm] = useState({ balance: '', payday: '', payAmount: '', frequency: 'weekly', confidence: 'confirmed' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('');

  const save = async (event) => {
    event.preventDefault();
    const amount = Number(form.payAmount);
    if (Number.isFinite(amount) && amount > 0) {
      const result = await addTransaction({
        merchant: 'Expected pay',
        category: 'Income',
        amount,
        type: 'income',
      });
      if (!result.ok) {
        setStatus(result.message);
        return;
      }
      await refreshTransactions();
    }
    setStatus('Payday setup saved. Dashboard calculations will use your latest income and transactions.');
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
            <Input label="Current balance" type="number" step="0.01" value={form.balance} onChange={(event) => setForm((current) => ({ ...current, balance: event.target.value }))} placeholder="900" />
            <Input label="Next payday" value={form.payday} onChange={(event) => setForm((current) => ({ ...current, payday: event.target.value }))} placeholder="Friday" />
            <Input label="Expected pay amount" type="number" step="0.01" value={form.payAmount} onChange={(event) => setForm((current) => ({ ...current, payAmount: event.target.value }))} placeholder="1400" />
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
            <Button type="submit" icon={Save}>Save payday setup</Button>
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
