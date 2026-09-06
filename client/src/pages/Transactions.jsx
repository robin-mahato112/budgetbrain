import { Pencil, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import PageContainer from '../components/layout/PageContainer';
import { useFinance } from '../hooks/useFinance';
import { budgetService } from '../services/budgetService';
import { formatCurrency } from '../utils/formatCurrency';

const fields = [
  ['date', 'Transaction date'], ['description', 'Description'], ['merchant', 'Merchant'], ['amount', 'Signed amount'],
  ['debit', 'Expense / debit'], ['credit', 'Income / credit'], ['type', 'Direction'], ['category', 'Category'],
  ['currency', 'Currency'], ['accountName', 'Account name'],
];

export default function Transactions() {
  const { transactions, importTransactions, previewCsvImport, confirmCsvImport, refreshTransactions } = useFinance();
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const visibleTransactions = useMemo(() => transactions, [transactions]);

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    setError(''); setStatus(''); setPreview(null);
    if (!file) { setFileName(''); setCsvText(''); return; }
    if (!file.name.toLowerCase().endsWith('.csv') || file.size > 1024 * 1024) {
      setError('Choose a CSV file no larger than 1 MB.'); return;
    }
    const text = await readFileText(file);
    setFileName(file.name); setCsvText(text); setLoading(true);
    if (previewCsvImport) {
      const result = await previewCsvImport(text, file.name, {});
      if (result.ok) { setPreview(result); setMapping(result.suggestedMapping || {}); }
      else setError(result.message);
    } else setPreview({ id: 'legacy', counts: { valid: 1 }, headers: [], needsMapping: false });
    setLoading(false);
  };

  const refreshPreview = async () => {
    setLoading(true); setError('');
    const result = await previewCsvImport(csvText, fileName, mapping);
    if (result.ok) setPreview(result); else setError(result.message);
    setLoading(false);
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!preview?.id || loading) return;
    setLoading(true); setError(''); setStatus('');
    const result = preview.id === 'legacy' ? await importTransactions(csvText) : await confirmCsvImport(preview.id);
    if (result.ok) {
      setStatus(preview.id === 'legacy'
        ? `${result.imported} transactions imported and categorized.`
        : `${result.imported} transactions imported. ${result.duplicates} duplicates and ${result.invalid} invalid rows were not saved.`);
      setCsvText(''); setFileName(''); setPreview(null); setMapping({});
    } else setError(result.message);
    setLoading(false);
  };

  const runSearch = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try { await refreshTransactions(search); }
    catch { setError('Transactions could not be searched right now.'); }
    finally { setLoading(false); }
  };

  const saveEdit = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      await budgetService.updateTransaction(editing.id, { merchant: editing.merchant, amount: Math.abs(Number(editing.amount)), type: Number(editing.amount) >= 0 ? 'income' : 'expense', category: editing.category });
      setEditing(null); await refreshTransactions(search); setStatus('Transaction updated.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Transaction could not be updated.'); }
    finally { setLoading(false); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try { await budgetService.deleteTransaction(id); await refreshTransactions(search); setStatus('Transaction deleted.'); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Transaction could not be deleted.'); }
  };
  const markRecurring = async (id) => {
    try { await budgetService.markTransactionRecurring(id, 'MONTHLY'); await refreshTransactions(search); setStatus('Marked as a monthly recurring candidate. Review it below.'); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Recurring candidate could not be saved.'); }
  };

  return (
    <PageContainer eyebrow="Transactions" title="Import and understand transactions" description="Preview bank CSV files, map unfamiliar columns, and review every row before it shapes safe-to-spend.">
      <div className="transactions-layout">
        <Card className="import-card">
          <div className="card-heading"><div><span className="card-heading__eyebrow">Bank CSV</span><h2>Upload transactions</h2></div></div>
          <form className="stack-form" onSubmit={upload}>
            <label className="file-drop">
              <Upload size={22} /><strong>{fileName || 'Choose a CSV file'}</strong>
              <span>Common Date, Description, Amount, Debit, Credit, Balance and Category columns are detected.</span>
              <input type="file" accept=".csv,text/csv" onChange={chooseFile} />
            </label>
            {preview?.headers?.length > 0 && (
              <div className="csv-mapping">
                <strong>Column mapping</strong>
                {fields.map(([field, label]) => (
                  <label key={field}>{label}
                    <select value={mapping[field] || ''} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value || undefined }))}>
                      <option value="">Not mapped</option>
                      {preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                    </select>
                  </label>
                ))}
                <Button type="button" variant="secondary" onClick={refreshPreview} disabled={loading}>Refresh preview</Button>
              </div>
            )}
            {preview && !preview.needsMapping && <ImportSummary preview={preview} />}
            {preview?.needsMapping && <p className="form-error">Map a date, description, and either amount or debit/credit column.</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            {status && <p className="status-message" role="status">{status}</p>}
            <Button type="submit" disabled={!preview?.id || preview.needsMapping || !preview.counts.valid || loading}>{loading ? 'Working...' : preview?.id === 'legacy' ? 'Import CSV' : 'Confirm import'}</Button>
          </form>
        </Card>

        <Card className="transactions-table-card">
          <div className="card-heading"><div><span className="card-heading__eyebrow">Ledger</span><h2>Transaction history</h2></div></div>
          <form className="transaction-search" onSubmit={runSearch}>
            <Input aria-label="Search transactions" placeholder="Search descriptions or categories" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button type="submit" variant="secondary" icon={Search} disabled={loading}>Search</Button>
          </form>
          {editing && <form className="transaction-search" onSubmit={saveEdit}>
            <Input aria-label="Edit merchant" value={editing.merchant} onChange={(e) => setEditing({ ...editing, merchant: e.target.value })} />
            <Input aria-label="Edit signed amount" type="number" step="0.01" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} />
            <Input aria-label="Edit category" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            <Button type="submit" disabled={loading}>Save</Button><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          </form>}
          <div className="transactions-table-wrap">
            <table className="transactions-table">
              <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th>Source</th><th>Review status</th><th>Actions</th></tr></thead>
              <tbody>
                {visibleTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td><td>{transaction.merchant}</td>
                    <td className={transaction.amount >= 0 ? 'amount-positive' : ''}>{formatCurrency(transaction.amount, { decimals: 2 })}</td>
                    <td>{transaction.category}</td><td>{labelSource(transaction.source)}</td><td>{needsReview(transaction) ? 'Needs review' : 'Confirmed'}</td>
                    <td><button type="button" aria-label={`Edit ${transaction.merchant}`} onClick={() => setEditing({ ...transaction, amount: String(transaction.amount) })}><Pencil size={14} /></button>{transaction.amount < 0 && <button type="button" onClick={() => markRecurring(transaction.id)}>Monthly</button>}<button type="button" aria-label={`Delete ${transaction.merchant}`} onClick={() => remove(transaction.id)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
                {!visibleTransactions.length && <tr><td colSpan="7">No transactions yet. Connect Demo Bank, import CSV, or use Smart Add.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

function ImportSummary({ preview }) {
  return (
    <div className="csv-preview">
      <div className="csv-counts"><span><strong>{preview.counts.total}</strong> detected</span><span><strong>{preview.counts.valid}</strong> valid</span><span><strong>{preview.counts.duplicates}</strong> possible duplicates</span><span><strong>{preview.counts.invalid}</strong> invalid</span></div>
      {preview.sample?.length > 0 && <div className="csv-preview-list">{preview.sample.slice(0, 5).map((row) => <div key={row.rowNumber}><span>{row.transactionDate?.slice?.(0, 10) || row.transactionDate}</span><strong>{row.description}</strong><span>{row.direction === 'INCOME' ? '+' : '-'}{Number(row.amount).toFixed(2)}</span></div>)}</div>}
      {preview.invalid?.length > 0 && <details><summary>Review invalid rows</summary><ul>{preview.invalid.map((row) => <li key={row.rowNumber}>Row {row.rowNumber}: {row.error}</li>)}</ul></details>}
    </div>
  );
}

function labelSource(source) { return ({ demo_bank: 'Demo Bank', csv: 'Bank CSV', ynab: 'YNAB', manual: 'Manual', ai_document: 'Receipt upload', quick_add: 'Quick add' })[source] || 'Manual'; }
function needsReview(transaction) { return ['Uncategorised', 'Needs Review', 'Mixed / Needs Review', 'everything'].includes(transaction.category) || String(transaction.merchant || '').trim().length < 2; }
function readFileText(file) { if (typeof file.text === 'function') return file.text(); return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(reader.error); reader.readAsText(file); }); }
