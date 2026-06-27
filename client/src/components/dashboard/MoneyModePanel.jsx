import { useState } from 'react';
import { CheckCircle2, HelpCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { budgetService } from '../../services/budgetService';
import { chatService } from '../../services/chatService';
import { formatCurrency } from '../../utils/formatCurrency';
import Button from '../common/Button';
import Card from '../common/Card';

export default function MoneyModePanel() {
  const { insights } = useFinance();
  const [form, setForm] = useState({ amount: '', category: '', description: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [explanation, setExplanation] = useState('');
  const [explainError, setExplainError] = useState('');
  const [explaining, setExplaining] = useState(false);
  const mode = insights?.moneyMode;
  const pressure = insights?.moneyPressure;

  if (!mode) return null;
  const isRecovery = mode.status === 'recovery';
  const isSetup = mode.status === 'setup';
  const action = isRecovery
    ? 'Pause non-essential spending and get back to zero first.'
    : isSetup
      ? 'Add income, rent, bills, or import transactions to calculate your real guilt-free spending.'
    : `You can spend up to ${formatCurrency(mode.suggestedSpendingLimit || 0)} safely before payday.`;
  const nextPayday = mode.nextPayday || 'Not set';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);
    try {
      setResult(await budgetService.checkAffordability({
        amount: form.amount,
        category: form.category,
        description: form.description,
      }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not check this purchase right now.');
    }
  };

  const explainNumber = async () => {
    if (explaining) return;
    setExplaining(true);
    setExplainError('');
    setExplanation('');
    try {
      const response = await chatService.explainSafeToSpend();
      setExplanation(response.explanation);
    } catch (requestError) {
      const code = requestError.response?.data?.error?.code;
      setExplainError(code === 'AI_NOT_CONFIGURED' || code === 'AI_FEATURES_DISABLED'
        ? 'AI explanations are not configured yet. Add a Groq API key on the server to enable them.'
        : requestError.response?.data?.message || 'Could not explain this number right now.');
    } finally {
      setExplaining(false);
    }
  };

  return (
    <section className={`money-mode-panel money-mode-panel--${mode.status}`} aria-label="Your money mode">
      <Card className="money-mode-card">
        <div className="money-mode-card__header">
          <ShieldCheck size={22} />
          <div>
            <span>Your money mode</span>
            <strong>{mode.name}</strong>
          </div>
        </div>
        <div className="money-mode-hero-row">
          <strong className="money-mode-hero">
            {isRecovery ? formatCurrency(mode.recoveryGap || 0) : isSetup ? 'Setup needed' : formatCurrency(mode.guiltFreeSpending || 0)}
          </strong>
          {!isSetup && (
            <Button type="button" size="small" variant="secondary" icon={Sparkles} onClick={explainNumber} disabled={explaining}>
              {explaining ? 'Explaining...' : 'Explain this'}
            </Button>
          )}
        </div>
        <span className="money-mode-hero-label">{isRecovery ? 'Recovery gap' : isSetup ? 'Protected money not set' : 'Safe to Spend'}</span>
        <div className="mode-metrics">
          <Metric label={isRecovery ? 'Protected money needed' : 'Protected money'} value={formatCurrency(mode.protectedMoney)} />
          <Metric label="Money pressure" value={pressure?.level || 'Not Ready'} />
          <Metric label="Next payday" value={nextPayday} />
          <Metric label="Confidence" value={insights?.confidence?.level || 'Not Ready'} />
          <Metric label="Last synced" value={formatSyncTime(insights?.demoBank?.lastSyncedAt || insights?.confidence?.lastUpdatedAt)} />
          <Metric label="Current balance" value={formatCurrency(mode.currentBalance)} />
        </div>
        <p className="mode-guidance">{pressure?.action || action}</p>
        {pressure?.reason && <p className="mode-guidance">Money Pressure: {pressure.reason}</p>}
        {explainError && <p className="form-error" role="alert">{explainError}</p>}
        {explanation && <p className="mode-guidance" role="status">{explanation}</p>}
        {isSetup && <p className="mode-guidance">Protected money is not set yet. Add rent, bills, or recurring essentials so BudgetBrain can protect your money.</p>}
        {mode.status === 'recovery' ? (
          <div className="priority-columns">
            <div>
              <h3>Recovery Plan</h3>
              <ul>{mode.survivalPriorities.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <h3>Pause or reduce</h3>
              <ul>{mode.pauseOrReduce.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="afford-card">
        <div className="money-mode-card__header">
          <HelpCircle size={22} />
          <div>
            <span>Can I afford this?</span>
            <strong>Test a purchase</strong>
          </div>
        </div>
        <form onSubmit={submit} className="afford-form">
          <label>
            Purchase amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="180"
            />
          </label>
          <label>
            Category
            <input
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="Dining, shopping, transport"
            />
          </label>
          <label>
            Description
            <input
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="What are you thinking of buying?"
            />
          </label>
          <Button type="submit" icon={CheckCircle2}>Check purchase</Button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
        {result && <p className="afford-result" role="status">{result.message}</p>}
      </Card>
    </section>
  );
}

function formatSyncTime(value) {
  if (!value) return 'Not synced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not synced';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function Metric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
