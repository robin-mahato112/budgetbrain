import { ShieldCheck } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/formatCurrency';
import Card from '../common/Card';

export default function MiniGuardPreview() {
  const { insights } = useFinance();
  const mode = insights?.moneyMode;
  if (!mode) return null;

  const isRecovery = mode.status === 'recovery';
  const isSetup = mode.status === 'setup';
  const amount = isRecovery ? mode.recoveryGap : mode.guiltFreeSpending;
  const label = isRecovery ? 'Recovery gap' : isSetup ? 'Setup needed' : 'Safe to Spend';
  const dailySafe = !isRecovery && !isSetup ? Math.max(0, amount / 3) : 0;

  return (
    <Card className={`mini-guard mini-guard--${mode.status}`}>
      <div className="mini-guard__small">
        <ShieldCheck size={18} />
        <div>
          <strong>{isSetup ? 'Setup Needed' : isRecovery ? `${formatCurrency(amount)} Gap` : `${formatCurrency(amount)} Safe`}</strong>
          <span>{isRecovery ? 'Recovery Mode' : `Until ${mode.nextPayday || 'payday'}`}</span>
        </div>
      </div>
      <div className="mini-guard__expanded">
        <Metric label={label} value={isSetup ? 'Not ready' : formatCurrency(amount)} />
        <Metric label="Protected Money" value={formatCurrency(mode.protectedMoney || 0)} />
        <Metric label="Money Pressure" value={insights.moneyPressure?.level || 'Not Ready'} />
        <Metric label="Daily Safe Amount" value={formatCurrency(dailySafe)} />
        <Metric label="Money Mode" value={mode.name} />
        <Metric label="Confidence" value={insights.confidence?.level || 'Low'} />
        <Metric label="Last Synced" value={formatDate(insights.demoBank?.lastSyncedAt || insights.confidence?.lastUpdatedAt)} />
      </div>
      <p>{insights.moneyPressure?.action || (mode.status === 'recovery' ? 'Get back to zero and protect essentials first.' : mode.status === 'watch' ? 'Safe-to-spend is low. Keep flexible spending small until payday.' : isSetup ? 'Connect Demo Bank, upload CSV, or add income to calculate this.' : `You can spend up to ${formatCurrency(amount)} until payday.`)}</p>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'Not synced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not synced';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
