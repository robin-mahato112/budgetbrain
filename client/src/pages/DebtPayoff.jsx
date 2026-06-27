import DebtCalculator from '../components/finance/DebtCalculator';
import PageContainer from '../components/layout/PageContainer';

export default function DebtPayoff() {
  return <PageContainer eyebrow="Reduce" title="Debt payoff" description="Explore how payment amounts affect time and total interest."><DebtCalculator /></PageContainer>;
}
