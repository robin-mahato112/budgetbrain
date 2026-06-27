import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/formatCurrency';
import Card from '../common/Card';

export default function BudgetProgress() {
  const { budgets } = useFinance();
  return (
    <Card className="budget-progress">
      <div className="card-heading">
        <div><span className="card-heading__eyebrow">This month</span><h2>Budget progress</h2></div>
        <Link className="text-link" to="/budget">Manage <ArrowRight size={14} /></Link>
      </div>
      <div className="budget-progress__list">
        {budgets.map((budget) => {
          const rawPercent = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
          const percent = Math.max(0, Math.min(100, Number.isFinite(rawPercent) ? rawPercent : 0));
          return (
            <div className="budget-row" key={budget.id}>
              <div className="budget-row__meta">
                <span>{budget.category}</span>
                <span>{formatCurrency(budget.spent)} of {formatCurrency(budget.limit)}</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${percent}%`, background: budget.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
