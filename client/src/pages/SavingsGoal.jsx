import SavingsGoalForm from '../components/finance/SavingsGoalForm';
import PageContainer from '../components/layout/PageContainer';

export default function SavingsGoal() {
  return <PageContainer eyebrow="Build" title="Savings goals" description="Turn large goals into measurable milestones."><SavingsGoalForm /></PageContainer>;
}
