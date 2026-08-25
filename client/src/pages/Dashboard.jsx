import MoneyModePanel from '../components/dashboard/MoneyModePanel';
import InsightCards from '../components/dashboard/InsightCards';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import MiniGuardPreview from '../components/dashboard/MiniGuardPreview';
import SmartEntryPanel from '../components/dashboard/SmartEntryPanel';
import PageContainer from '../components/layout/PageContainer';
import { useFinance } from '../hooks/useFinance';

export default function Dashboard() {
  const { error } = useFinance();
  return (
    <PageContainer
      eyebrow="Overview"
      title="Your payday guardrail"
      description="Bank balances show money in the account. BudgetBrain shows what is safe to spend before payday after essentials are protected."
    >
      {error && <p className="data-warning" role="status">{error}</p>}
      <MoneyModePanel />
      <InsightCards />
      <MiniGuardPreview />
      <div className="dashboard-grid">
        <div className="dashboard-grid__main">
          <RecentTransactions />
          <SmartEntryPanel />
        </div>
      </div>
    </PageContainer>
  );
}
