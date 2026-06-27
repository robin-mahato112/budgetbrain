import { useState } from 'react';
import { FileUp, Save, Sparkles, Trash2 } from 'lucide-react';
import { budgetService } from '../../services/budgetService';
import { useFinance } from '../../hooks/useFinance';
import Button from '../common/Button';
import Card from '../common/Card';

const kinds = [
  { value: 'receipt', label: 'Upload receipt' },
  { value: 'payslip', label: 'Upload payslip' },
  { value: 'bill', label: 'Bill' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'screenshot', label: 'Screenshot' },
];

export default function SmartEntryPanel() {
  const { refreshTransactions } = useFinance();
  const [kind, setKind] = useState('receipt');
  const [file, setFile] = useState(null);
  const [quickText, setQuickText] = useState('');
  const [preview, setPreview] = useState(null);
  const [edited, setEdited] = useState({});
  const [status, setStatus] = useState('');

  const runUpload = async (event) => {
    event.preventDefault();
    if (!file) return;
    setStatus('');
    const next = await budgetService.uploadDocument({ file, kind });
    setPreview(next);
    setEdited(next.extractedData);
  };

  const runQuickAdd = async () => {
    if (!quickText.trim()) return;
    setStatus('');
    const next = await budgetService.quickAddPreview(quickText);
    setPreview(next);
    setEdited(next.extractedData);
  };

  const save = async () => {
    if (!preview) return;
    const result = await budgetService.confirmDocument(preview.id, edited);
    await refreshTransactions();
    setStatus(`${result.saved} confirmed item${result.saved === 1 ? '' : 's'} saved.`);
    setPreview(null);
    setEdited({});
    setFile(null);
    setQuickText('');
  };

  const discard = async () => {
    if (preview) await budgetService.deleteDocument(preview.id).catch(() => {});
    setPreview(null);
    setEdited({});
  };

  return (
    <Card className="smart-entry-card">
      <div className="card-heading">
        <div>
          <span className="card-heading__eyebrow">Smart Add</span>
          <h2>Update your payday guardrail</h2>
        </div>
        <Sparkles size={20} />
      </div>
      <div className="smart-entry-options">
        <form onSubmit={runUpload}>
          <label>
            Upload bank CSV, receipt, payslip, or bill
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              {kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="file-drop file-drop--compact">
            <FileUp size={20} />
            <strong>{file?.name || 'Upload so BudgetBrain can preview details before saving.'}</strong>
            <input type="file" accept=".png,.jpg,.jpeg,.pdf,.csv,.txt,image/png,image/jpeg,application/pdf,text/csv,text/plain" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <Button type="submit" size="small" disabled={!file}>Detect details</Button>
        </form>
        <div>
          <label>
            Quick add sentence
            <textarea value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder="I spent $25 on lunch and $60 on petrol today." />
          </label>
          <small>Preview first. BudgetBrain will not save parsed items until you confirm.</small>
          <Button type="button" size="small" variant="secondary" onClick={runQuickAdd} disabled={!quickText.trim()}>Preview sentence</Button>
        </div>
      </div>
      {preview && (
        <div className="extraction-preview">
          <span>{preview.extractionStatus === 'MANUAL_FALLBACK' ? 'Manual fallback' : 'AI detected'} - review before saving.</span>
          {preview.extractionMessage && <p>{preview.extractionMessage}</p>}
          <EditablePreview data={edited} onChange={setEdited} />
          <div className="preview-actions">
            <Button type="button" size="small" icon={Save} onClick={save}>Save confirmed</Button>
            <Button type="button" size="small" variant="secondary" icon={Trash2} onClick={discard}>Discard</Button>
          </div>
        </div>
      )}
      {status && <p className="status-message" role="status">{status}</p>}
    </Card>
  );
}

function EditablePreview({ data, onChange }) {
  if (Array.isArray(data.items)) {
    return (
      <div className="quick-preview-list">
        {data.items.map((item, index) => (
          <div key={`${item.description}-${index}`} className="quick-preview-row">
            <input aria-label={`Item ${index + 1} description`} value={item.description || ''} onChange={(event) => updateItem(onChange, data, index, 'description', event.target.value)} />
            <input aria-label={`Item ${index + 1} amount`} type="number" value={item.amount || ''} onChange={(event) => updateItem(onChange, data, index, 'amount', event.target.value)} />
            <input aria-label={`Item ${index + 1} category`} value={item.category || ''} onChange={(event) => updateItem(onChange, data, index, 'category', event.target.value)} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="preview-grid">
      {Object.entries(data).filter(([key]) => key !== 'aiDetected').map(([key, value]) => (
        <label key={key}>
          {labelFor(key)}
          <input value={value ?? ''} onChange={(event) => onChange({ ...data, [key]: event.target.value })} />
        </label>
      ))}
    </div>
  );
}

function updateItem(onChange, data, index, key, value) {
  const items = data.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item);
  onChange({ ...data, items });
}

function labelFor(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}
