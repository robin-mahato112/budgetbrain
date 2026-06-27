import { Landmark, ListChecks, Shield, Waves } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/formatCurrency';
import Card from '../common/Card';

export default function InsightCards() {
  const { insights } = useFinance();
  if (!insights) return null;
  const mode = insights.moneyMode || {};

  const cards = [
    { label: 'Demo Bank Status', value: insights.demoBank?.connected ? 'Connected' : 'Not connected', detail: insights.demoBank?.message || 'Connect demo bank or import CSV', icon: Landmark },
    { label: 'Protected Essentials', value: formatCurrency(mode.protectedMoney || 0), detail: 'protected before payday', icon: Shield },
    { label: 'Money Pressure', value: insights.moneyPressure?.level || 'Not Ready', detail: insights.moneyPressure?.reason || 'Setup needed', icon: Waves },
    { label: 'Recent Transactions', value: String(insights.importedTransactions || 0), detail: 'imported or synced', icon: ListChecks },
  ];

  return (
    <section className="insight-grid" aria-label="Monthly transaction insights">
      {cards.map(({ label, value, detail, icon: Icon }) => (
        <Card className="insight-card" key={label}>
          <Icon size={18} />
          <span>{label}</span>
          <strong>{value}</strong>
          {detail && <small>{detail}</small>}
        </Card>
      ))}
      {insights.categoryWarning && <p className="insight-warning" role="status">{insights.categoryWarning}</p>}
    </section>
  );
}
