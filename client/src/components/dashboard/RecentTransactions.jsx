import { ArrowRight, ShoppingBag, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/formatCurrency';
import Card from '../common/Card';

export default function RecentTransactions() {
  const { transactions } = useFinance();
  return (
    <Card className="transactions-card">
      <div className="card-heading">
        <div><span className="card-heading__eyebrow">Activity</span><h2>Recent transactions</h2></div>
        <Link className="text-link" to="/transactions">View all <ArrowRight size={14} /></Link>
      </div>
      <div className="transaction-list">
        {transactions.slice(0, 5).map((transaction) => {
          const Icon = transaction.type === 'income' ? TrendingUp : transaction.type === 'saving' ? TrendingDown : ShoppingBag;
          const category = ['everything', 'Uncategorised', 'Mixed / Needs Review'].includes(transaction.category)
            ? 'Needs review'
            : transaction.category;
          const merchant = String(transaction.merchant || '').trim().length < 2 ? 'Needs review' : transaction.merchant;
          return (
            <div className="transaction-row" key={transaction.id}>
              <div className={`transaction-row__icon transaction-row__icon--${transaction.type}`}><Icon size={17} /></div>
              <div className="transaction-row__details"><strong>{merchant}</strong><span>{category} - {transaction.date}</span></div>
              <strong className={transaction.amount > 0 ? 'amount-positive' : ''}>{formatCurrency(transaction.amount, { decimals: 2 })}</strong>
            </div>
          );
        })}
        {!transactions.length && <p className="empty-state__inline">Import transactions or quick add one sentence to start seeing activity.</p>}
      </div>
    </Card>
  );
}
