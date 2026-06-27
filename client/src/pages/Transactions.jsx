import { Search, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import PageContainer from '../components/layout/PageContainer';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency } from '../utils/formatCurrency';

const exampleCsv = `date,description,amount,type
2026-06-01,Woolworths,-82.40,expense
2026-06-02,Salary,1400.00,income
2026-06-03,Netflix,-22.99,expense`;

export default function Transactions() {
  const { transactions, importTransactions, refreshTransactions } = useFinance();
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const visibleTransactions = useMemo(() => transactions, [transactions]);

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    setError('');
    setStatus('');
    setFileName(file?.name || '');
    setCsvText(file ? await readFileText(file) : '');
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!csvText.trim() || loading) return;
    setLoading(true);
    setError('');
    setStatus('');
    const result = await importTransactions(csvText);
    if (result.ok) {
      setStatus(`${result.imported} transactions imported and categorized.`);
      setCsvText('');
      setFileName('');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const runSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await refreshTransactions(search);
    } catch {
      setError('Transactions could not be searched right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      eyebrow="Transactions"
      title="Import and review transactions"
      description="Review demo bank, CSV, quick add, manual, and receipt-upload transactions before they shape safe-to-spend."
    >
      <div className="transactions-layout">
        <Card className="import-card">
          <div className="card-heading">
            <div>
              <span className="card-heading__eyebrow">CSV import</span>
              <h2>Upload transactions</h2>
            </div>
          </div>
          <form className="stack-form" onSubmit={upload}>
            <label className="file-drop">
              <Upload size={22} />
              <strong>{fileName || 'Choose a CSV file'}</strong>
              <span>Required columns: date, description, amount, type</span>
              <input type="file" accept=".csv,text/csv" onChange={chooseFile} />
            </label>
            <pre className="csv-example">{exampleCsv}</pre>
            {error && <p className="form-error" role="alert">{error}</p>}
            {status && <p className="status-message" role="status">{status}</p>}
            <Button type="submit" disabled={!csvText.trim() || loading}>{loading ? 'Importing...' : 'Import CSV'}</Button>
          </form>
        </Card>

        <Card className="transactions-table-card">
          <div className="card-heading">
            <div>
              <span className="card-heading__eyebrow">Ledger</span>
              <h2>Transaction history</h2>
            </div>
          </div>
          <form className="transaction-search" onSubmit={runSearch}>
            <Input aria-label="Search transactions" placeholder="Search descriptions or categories" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button type="submit" variant="secondary" icon={Search} disabled={loading}>Search</Button>
          </form>
          <div className="transactions-table-wrap">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Review status</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>{transaction.merchant}</td>
                    <td className={transaction.amount >= 0 ? 'amount-positive' : ''}>{formatCurrency(transaction.amount, { decimals: 2 })}</td>
                    <td>{transaction.category}</td>
                    <td>{labelSource(transaction.source)}</td>
                    <td>{needsReview(transaction) ? 'Needs Review' : 'Clean'}</td>
                  </tr>
                ))}
                {!visibleTransactions.length && (
                  <tr><td colSpan="6">No transactions yet. Connect Demo Bank, import CSV, or use Smart Add on the dashboard.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

function labelSource(source) {
  const labels = {
    demo_bank: 'Demo bank',
    csv: 'CSV import',
    manual: 'Manual',
    ai_document: 'Receipt upload',
    quick_add: 'Quick add',
  };
  return labels[source] || 'Manual';
}

function needsReview(transaction) {
  return ['Uncategorised', 'Needs Review', 'Mixed / Needs Review', 'everything'].includes(transaction.category) || String(transaction.merchant || '').trim().length < 2;
}

function readFileText(file) {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
