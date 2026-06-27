import DemoBankPanel from '../components/dashboard/DemoBankPanel';
import PageContainer from '../components/layout/PageContainer';

export default function DemoBank() {
  return (
    <PageContainer
      eyebrow="Mock Bank Sync"
      title="Connect Bank"
      description="Sync realistic demo bank data for portfolio testing. No real bank account is connected."
    >
      <DemoBankPanel />
    </PageContainer>
  );
}
