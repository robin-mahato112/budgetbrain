import { Link, useParams } from 'react-router-dom';

const documents = {
  privacy: {
    title: 'Privacy notice',
    updated: '23 June 2026',
    sections: [
      ['What we collect', 'BudgetBrain stores your name, email address, password hash, saved chats, budgets, transactions, savings goals, debt records and AI usage totals. Do not enter bank passwords, tax file numbers, card numbers or identity-document details.'],
      ['Why we use it', 'We use this information to authenticate you, provide requested finance tools, preserve your workspace, enforce AI usage limits, prevent abuse and maintain service reliability.'],
      ['AI processing', 'When you use the AI guide, your message and recent conversation context are sent to Groq to generate a response. Groq is a separate service provider with its own security and data-handling terms.'],
      ['Storage and hosting', 'Application data is stored in PostgreSQL by the selected hosting provider. Production operators must document the hosting region, backup schedule, retention period and vendor agreements before launch.'],
      ['Your choices', 'You can download a copy of your account data or permanently delete your account from Settings. You may also request correction of inaccurate personal information.'],
      ['Security and retention', 'BudgetBrain uses password hashing, authenticated API access and transport security supplied by the deployment platform. No internet service can guarantee absolute security. Data should be retained only while needed for the service or legal obligations.'],
      ['Contact and complaints', 'Before public launch, replace this section with the operator’s legal name, privacy contact email, response timeframe and complaint escalation process.'],
    ],
  },
  terms: {
    title: 'Terms of use',
    updated: '23 June 2026',
    sections: [
      ['Educational use only', 'BudgetBrain provides general educational information and calculation tools. It is not a licensed financial adviser and does not provide personal financial product advice, legal advice, tax advice or credit assistance.'],
      ['AI limitations', 'AI output may be incomplete, outdated, biased or wrong. It may misunderstand your circumstances. Do not rely on an AI response as the sole basis for a financial decision.'],
      ['No guarantees', 'Calculations are estimates and may not include fees, taxes, compounding differences, changing rates or lender-specific rules. Service availability and stored data are not guaranteed.'],
      ['Your responsibility', 'Check important information independently and consult an appropriately licensed professional before acting on major financial decisions.'],
      ['Acceptable use', 'Do not misuse the service, attempt unauthorised access, upload unlawful content or use the output to harm or deceive others.'],
      ['Accounts and limits', 'You are responsible for securing your account credentials. BudgetBrain may enforce request limits, suspend abusive use or remove data where reasonably necessary to protect the service.'],
      ['Production requirement', 'These draft terms require review by qualified Australian counsel before commercial launch.'],
    ],
  },
};

export default function LegalPage({ type: fixedType }) {
  const params = useParams();
  const type = fixedType || params.type;
  const document = documents[type] || documents.privacy;

  return (
    <main className="legal-page">
      <div className="legal-card">
        <Link className="back-link" to="/">Back to BudgetBrain</Link>
        <p className="eyebrow">BudgetBrain compliance centre</p>
        <h1>{document.title}</h1>
        <p className="legal-updated">Last updated {document.updated}</p>
        <div className="legal-warning">
          Draft product copy for a portfolio project. It is not legal advice or evidence of regulatory compliance.
        </div>
        {document.sections.map(([title, body]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
