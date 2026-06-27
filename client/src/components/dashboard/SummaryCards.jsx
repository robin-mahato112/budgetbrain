import { ArrowDownRight, ArrowUpRight, Landmark, PiggyBank, Receipt, Wallet } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/formatCurrency';
import Card from '../common/Card';

const cards = [
  { key: 'income', label: 'Total income', icon: Wallet, change: '+6.4%', trend: 'up', tone: 'blue' },
  { key: 'expenses', label: 'Expenses', icon: Receipt, change: '+2.1%', trend: 'down', tone: 'orange' },
  { key: 'savings', label: 'Savings', icon: PiggyBank, change: '+12.8%', trend: 'up', tone: 'green' },
  { key: 'debt', label: 'Total debt', icon: Landmark, change: '-4.2%', trend: 'up', tone: 'red' },
];

export default function SummaryCards() {
  const { summary } = useFinance();
  return (
    <div className="summary-grid">
      {cards.map(({ key, label, icon: Icon, change, trend, tone }) => (
        <Card className="summary-card" key={key}>
          <div className={`summary-card__icon summary-card__icon--${tone}`}><Icon size={20} /></div>
          <div className="summary-card__content">
            <span>{label}</span>
            <strong>{formatCurrency(summary[key])}</strong>
          </div>
          <div className={`summary-card__change summary-card__change--${trend}`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {change}
          </div>
        </Card>
      ))}
    </div>
  );
}
