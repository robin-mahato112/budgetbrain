import { ArrowRight, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';

export default function FinanceTips() {
  const navigate = useNavigate();
  return (
    <Card className="finance-tip">
      <div className="finance-tip__icon"><Lightbulb size={21} /></div>
      <div>
        <span className="card-heading__eyebrow">Smart move</span>
        <h2>Your emergency fund is 62% complete</h2>
        <p>Adding $320 each month would put you on track to reach the goal before December.</p>
        <button className="text-link" onClick={() => navigate('/savings')}>Review savings plan <ArrowRight size={14} /></button>
      </div>
    </Card>
  );
}
