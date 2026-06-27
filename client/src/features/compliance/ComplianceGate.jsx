import { useState } from 'react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'budgetbrain-compliance-v1';

export default function ComplianceGate() {
  const [open, setOpen] = useState(() => !localStorage.getItem(CONSENT_KEY));

  if (!open) return null;

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    setOpen(false);
  };

  return (
    <div className="consent-backdrop" role="presentation">
      <section className="consent-card" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <p className="eyebrow">Before you continue</p>
        <h2 id="consent-title">Money decisions deserve a human check.</h2>
        <p>
          BudgetBrain uses AI to provide general educational information. It is not a licensed financial
          adviser and its responses may be inaccurate.
        </p>
        <ul>
          <li>Your chat text is sent to the configured AI provider.</li>
          <li>Do not enter account numbers, passwords or identity documents.</li>
          <li>Verify important decisions with an appropriately licensed professional.</li>
        </ul>
        <p className="consent-links">
          Read the <Link to="/privacy">privacy notice</Link> and <Link to="/terms">terms</Link>.
        </p>
        <button className="primary-button" type="button" onClick={accept}>
          I understand and want to continue
        </button>
      </section>
    </div>
  );
}
