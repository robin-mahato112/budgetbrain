import BillSplitterForm from '../components/finance/BillSplitter';
import PageContainer from '../components/layout/PageContainer';

export default function BillSplitter() {
  return <PageContainer eyebrow="Share" title="Bill splitter" description="Calculate a fair split, including an optional tip."><BillSplitterForm /></PageContainer>;
}
