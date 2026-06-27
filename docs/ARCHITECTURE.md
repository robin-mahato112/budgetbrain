# BudgetBrain Architecture

BudgetBrain is a Payday Guardrail + Money Pressure app. Banking apps show your balance, but your balance is not the same as spendable money. BudgetBrain protects essentials first, then shows what is safe to spend before payday.

```text
React Client
  |
  | REST API calls
  v
Express Backend
  |
  | Prisma ORM
  v
PostgreSQL Database
```

## Backend Services

- Auth Service: registration, login, JWT authentication and sensitive account actions.
- Income / Payday Service: balance, payday, pay amount, frequency and confidence setup.
- Protected Essentials Service: detects rent, food basics, transport, bills, insurance, subscriptions and debt repayments.
- Transaction Service: manual entries, CSV import, search, validation and category cleanup.
- Demo Bank Provider: portfolio-only mock provider that returns demo balances and transactions.
- Bank Sync Service: provider interface for connect, sync, balances, transactions and disconnect.
- Safe-to-Spend Engine: backend source of truth for protected money, safe-to-spend, recovery gap, money mode and confidence.
- Money Pressure Engine: Low, Medium, High and Critical pressure levels with one calm next action.
- AI Explanation Service: Groq-powered explanation/action summaries from safe financial summaries only.
- Document Extraction Service: receipt, payslip and bill extraction preview with user confirmation.
- Privacy / Export / Delete Service: user-owned data export, clearing and account deletion.

## External Services

Groq API:

- Used only for small AI explanations and action summaries.
- Does not calculate financial truth.
- Receives safe financial summaries only.

Gemini / OCR:

- Used only for receipt, payslip, bill and document extraction.
- User confirms extracted data before saving.

Future Open Banking Provider:

- Not implemented now.
- Demo Bank simulates this for portfolio/demo review.
- A future provider can replace the mock provider behind the same Bank Sync Service interface.

## Architecture Rule

Backend calculations are the source of truth. AI explains backend results but does not decide financial values.
