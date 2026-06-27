import MiniGuardPreview from '../components/dashboard/MiniGuardPreview';
import MoneyModePanel from '../components/dashboard/MoneyModePanel';
import PageContainer from '../components/layout/PageContainer';

export default function MiniGuard() {
  return (
    <PageContainer
      eyebrow="Widget preview"
      title="Mini Guard"
      description="A compact web preview of safe-to-spend, money pressure, confidence, and the next action before payday."
    >
      <MiniGuardPreview />
      <MoneyModePanel />
    </PageContainer>
  );
}
