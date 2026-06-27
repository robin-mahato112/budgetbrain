import { MoreHorizontal } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/formatCurrency';
import Card from '../common/Card';

export default function SpendingChart() {
  const { spendingTrend } = useFinance();
  if (!spendingTrend.length) {
    return <Card className="chart-card"><div className="empty-state"><h2>No spending data</h2><p>Add transactions to see a trend.</p></div></Card>;
  }
  const max = Math.max(1, ...spendingTrend.map((item) => Number(item.amount) || 0));
  const points = spendingTrend.map((item, index) => {
    const x = (index / (spendingTrend.length - 1)) * 100;
    const y = 92 - (item.amount / max) * 70;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Card className="chart-card">
      <div className="card-heading">
        <div><span className="card-heading__eyebrow">Cash flow</span><h2>Monthly spending</h2></div>
        <button className="icon-button" onClick={() => window.alert('Additional chart filters will be available when transaction APIs are connected.')} aria-label="Spending chart options"><MoreHorizontal size={19} /></button>
      </div>
      <div className="chart-card__metric">
        <strong>{formatCurrency(spendingTrend.at(-1)?.amount)}</strong>
        <span>2.1% from last month</span>
      </div>
      <div className="line-chart" role="img" aria-label="Monthly spending trend from January to June">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="spendingFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity=".28" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,100 ${points} 100,100`} fill="url(#spendingFill)" />
          <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="line-chart__labels">
          {spendingTrend.map((item) => <span key={item.month}>{item.month}</span>)}
        </div>
      </div>
    </Card>
  );
}
