import SummaryCards from '../components/dashboard/SummaryCards';
import SpendingChart from '../components/dashboard/SpendingChart';
import BudgetProgress from '../components/dashboard/BudgetProgress';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import MiniChatbot from '../components/chatbot/MiniChatbot';
import FinanceTips from '../components/chatbot/FinanceTips';
import PageContainer from '../components/layout/PageContainer';
import { useFinance } from '../hooks/useFinance';

export default function Dashboard() {
  const { error } = useFinance();
  return (
    <PageContainer
      eyebrow="Overview"
      title="Your financial dashboard"
      description="A clear view of your cash flow, progress, and next best actions."
    >
      {error && <p className="data-warning" role="status">{error}</p>}
      <SummaryCards />
      <div className="dashboard-grid">
        <div className="dashboard-grid__main">
          <SpendingChart />
          <RecentTransactions />
        </div>
        <div className="dashboard-grid__side">
          <MiniChatbot />
          <FinanceTips />
        </div>
        <div className="dashboard-grid__full">
          <BudgetProgress />
        </div>
      </div>
    </PageContainer>
  );
}
