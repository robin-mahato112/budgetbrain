import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/formatCurrency';
import Card from '../common/Card';

export default function InsightCharts() {
  const { insights } = useFinance();
  if (!insights) return null;

  const categories = [
    insights.topSpendingCategory,
    { category: 'Protected essentials', amount: insights.essentialsSpending || 0 },
    { category: 'Flexible spending', amount: insights.lifestyleSpending || 0 },
  ].filter((item) => item?.amount > 0);
  const maxCategory = Math.max(...categories.map((item) => item.amount), 1);
  const mode = insights.moneyMode;
  const totalModeMoney = Math.max((mode?.protectedMoney || 0) + (mode?.guiltFreeSpending || 0), 1);

  return (
    <section className="chart-strip chart-strip--compact" aria-label="Payday guardrail charts">
      <Card className="mini-chart-card">
        <h2>Spending by category</h2>
        {categories.map((item) => (
          <div className="bar-row" key={item.category}>
            <span>{item.category}</span>
            <div><i style={{ width: `${Math.max(6, (item.amount / maxCategory) * 100)}%` }} /></div>
            <strong>{formatCurrency(item.amount)}</strong>
          </div>
        ))}
      </Card>
      <Card className="mini-chart-card">
        <h2>Protected vs safe to spend</h2>
        <div className="stacked-money">
          <span style={{ width: `${((mode?.protectedMoney || 0) / totalModeMoney) * 100}%` }} />
          <i style={{ width: `${((mode?.guiltFreeSpending || 0) / totalModeMoney) * 100}%` }} />
        </div>
        <p>Protected {formatCurrency(mode?.protectedMoney || 0)} - Safe {formatCurrency(mode?.guiltFreeSpending || 0)}</p>
      </Card>
    </section>
  );
}
