import { Link } from 'react-router-dom';
import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/formatCurrency';
import Card from '../common/Card';

export default function PaydayPlan() {
  const { financialState: state, loading, error, refreshTransactions } = useFinance();
  if (loading) return <Card><p role="status">Loading your payday plan…</p></Card>;
  if (!state) return error ? <Card><p>Your plan is temporarily unavailable.</p><button type="button" onClick={() => refreshTransactions().catch(() => {})}>Retry loading plan</button></Card> : null;
  const format = (value) => formatCurrency(value, { decimals: 2, currency: state.currency });
  const outstanding = state.readiness.checks.filter((item) => !item.ok);

  return <section className="payday-plan" aria-label="Your payday plan">
    {outstanding.length > 0 && <Card className="payday-plan__setup">
      <div><span className="card-heading__eyebrow">Start here</span><h2>Make your spending estimate ready</h2><p>Complete these details before relying on an allowance.</p></div>
      <ul>{outstanding.map((item) => <li key={item.id}><Link to={item.href}>{item.label}<span aria-hidden="true"> →</span></Link></li>)}</ul>
    </Card>}
    <Card className="payday-plan__breakdown">
      <div className="card-heading"><div><span className="card-heading__eyebrow">Your calculation · {state.currency}</span><h2>Where your balance goes</h2></div><Link to="/payday-setup">Update balance</Link></div>
      <dl className="payday-plan__numbers">
        <div><dt>Current balance</dt><dd>{format(state.availableBalance)}</dd></div>
        <div><dt>Protected costs</dt><dd>−{format(state.upcomingObligationsTotal)}</dd></div>
        <div><dt>Safety buffer</dt><dd>−{format(state.safetyBuffer)}</dd></div>
        <div><dt>{state.safeToSpend < 0 ? 'Projected shortfall' : 'Remaining before payday'}</dt><dd>{state.readiness.ready ? format(state.safeToSpend) : 'Setup needed'}</dd></div>
      </dl>
      {state.dailySafeToSpend !== null && <p className="payday-plan__daily">{format(state.dailySafeToSpend)} per day across {state.daysUntilPayday} days. This is an estimate based on the balance you entered.</p>}
      <details><summary>Assumptions behind this estimate</summary><ul>{state.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></details>
    </Card>
    <Card className="payday-plan__bills">
      <div className="card-heading"><div><span className="card-heading__eyebrow">Due before payday</span><h2>Upcoming protected costs</h2></div><Link to="/protected-essentials">Review costs</Link></div>
      {state.upcomingObligations.length ? <ol className="payday-plan__timeline">{state.upcomingObligations.slice(0, 8).map((bill) => <li key={bill.id}>
        <div><time dateTime={bill.dueDate}>{bill.dueDate}</time><strong>{bill.name}</strong>{bill.estimatedDate && <small>Estimated date</small>}</div><span>{format(bill.amount)}</span>
      </li>)}</ol> : <p>{state.readiness.ready ? 'No protected payments fall in this payday window.' : 'Complete setup to see your upcoming payments.'}</p>}
      {state.upcomingObligations.length > 8 && <p>{state.upcomingObligations.length - 8} more payments included in the total.</p>}
      {state.recurringNeedsReview.length > 0 && <p className="payday-plan__review"><Link to="/protected-essentials">Review {state.recurringNeedsReview.length} recurring {state.recurringNeedsReview.length === 1 ? 'payment' : 'payments'}</Link> · Not protected yet</p>}
    </Card>
  </section>;
}
