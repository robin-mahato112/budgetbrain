import { ArrowRight, ShoppingBag, TrendingDown, TrendingUp } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/formatCurrency';
import Card from '../common/Card';

export default function RecentTransactions() {
  const { transactions } = useFinance();
  return (
    <Card className="transactions-card">
      <div className="card-heading">
        <div><span className="card-heading__eyebrow">Activity</span><h2>Recent transactions</h2></div>
        <button className="text-link" onClick={() => window.alert('The full transaction ledger will be connected to the transaction API.')}>View all <ArrowRight size={14} /></button>
      </div>
      <div className="transaction-list">
        {transactions.slice(0, 5).map((transaction) => {
          const Icon = transaction.type === 'income' ? TrendingUp : transaction.type === 'saving' ? TrendingDown : ShoppingBag;
          return (
            <div className="transaction-row" key={transaction.id}>
              <div className={`transaction-row__icon transaction-row__icon--${transaction.type}`}><Icon size={17} /></div>
              <div className="transaction-row__details"><strong>{transaction.merchant}</strong><span>{transaction.category} · {transaction.date}</span></div>
              <strong className={transaction.amount > 0 ? 'amount-positive' : ''}>{formatCurrency(transaction.amount, { decimals: 2 })}</strong>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
