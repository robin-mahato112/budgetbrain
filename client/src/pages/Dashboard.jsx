import MoneyModePanel from '../components/dashboard/MoneyModePanel';
import InsightCards from '../components/dashboard/InsightCards';
import InsightCharts from '../components/dashboard/InsightCharts';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import DemoBankPanel from '../components/dashboard/DemoBankPanel';
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
      <MiniGuardPreview />
      <InsightCards />
      <InsightCharts />
      <div className="dashboard-grid">
        <div className="dashboard-grid__main">
          <DemoBankPanel />
          <SmartEntryPanel />
          <RecentTransactions />
        </div>
      </div>
    </PageContainer>
  );
}
