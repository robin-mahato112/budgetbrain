import BudgetForm from '../components/finance/BudgetForm';
import PageContainer from '../components/layout/PageContainer';

export default function BudgetTracker() {
  return <PageContainer eyebrow="Plan" title="Budget tracker" description="Map monthly income and expenses, then see what remains."><BudgetForm /></PageContainer>;
}
