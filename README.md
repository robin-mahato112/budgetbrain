# BudgetBrain AI

BudgetBrain is a Payday Guardrail + Money Pressure app. Banking apps show your balance, but your balance is not the same as spendable money. BudgetBrain protects essentials first, then shows what is safe to spend before payday.

> BudgetBrain is an educational tool, not a licensed financial adviser. AI explanations are supportive summaries of backend calculations, not professional financial advice.

BudgetBrain uses one transparent formula:

```text
Safe to Spend = Current Balance + Confirmed Income Before Payday - Protected Money Before Payday
```

AI is secondary. The backend calculates safe-to-spend, protected money, recovery gap and money mode. AI only explains those backend results in plain English using a safe summary.

## Why this project matters

BudgetBrain demonstrates the kind of product engineering expected in a real SaaS codebase: secure authentication, relational data modeling, validation, rate limiting, error handling, privacy controls, automated verification, deployment configuration and a polished responsive interface. The goal is not just to show screens, but to show a maintainable path from local development to production deployment.

## Project Summary

BudgetBrain helps users answer one practical question: how much money is actually safe to spend before payday after rent, food, transport, bills, debt and essentials are protected?

The app supports demo bank sync, Payday Setup, Protected Essentials, Transactions, Mini Guard preview, Freedom/Watch/Recovery modes, Money Pressure, Can I Afford This, Smart Add, and small AI explanations.

## Real Problems This Project Solves

BudgetBrain AI is built around one everyday problem: people can see their bank balance, but they cannot easily see what is safe to spend before payday after essentials are protected.

It focuses on:

- Surviving until payday.
- Protecting rent, food, transport, bills, debt and essentials.
- Avoiding accidental overspending.
- Showing safe-to-spend clearly.
- Showing Money Pressure calmly.
- Helping users recover if they are short.

## Product Features Mapped To Problems

| Real Problem | BudgetBrain AI Feature |
|---|---|
| Real Problem | BudgetBrain AI Feature |
|---|---|
| Bank balance is not spendable money | Safe-to-Spend calculation |
| Essentials need protection first | Protected Essentials |
| Payday is close and money is tight | Money Pressure |
| User is short before payday | Recovery Mode and short Recovery Plan |
| Demo review needs realistic data | Demo Bank Connection |
| User wants quick status | Mini Guard Preview |
| Manual data entry is slow | CSV import and Smart Add preview |
| Numbers need plain-English explanation | Explain This Number |

## What I Built To Demonstrate

This project demonstrates full-stack product engineering: authenticated user flows, provider-based demo bank sync, relational data modeling, validation, security middleware, AI provider integration, usage limits, testing, deployment configuration, privacy-aware account controls, CSV transaction import, safe-to-spend calculation and AI explanations.

## Demo Bank Connection

BudgetBrain includes a mock bank connection for demo and portfolio review.

This does not connect to a real bank. It simulates bank syncing by importing realistic demo balances, income deposits, bills, debt repayments and transactions.

The app is designed with a provider-based architecture so a real Open Banking provider could be added later.

## Future Real Bank Integration

A real production version would connect through an Open Banking / Consumer Data Right provider. BudgetBrain does not store real bank login credentials.

## AI Role

AI does not calculate financial truth. The backend calculates safe-to-spend, protected money, recovery gap and mode. AI only explains the result in plain English using a safe summary.

## Live Demo

Frontend: Coming soon
Backend API: Coming soon

## Demo Access

Demo user: demo@budgetbrain.local
Password: DemoPassword123

Demo access will be enabled after deployment.

## Product Preview

Screenshots should focus on the final product surface:

- Dashboard
- Connect Bank
- Payday Setup
- Protected Essentials
- Transactions
- Mini Guard
- Settings

## Core Features

- Secure registration, login and protected routes with JWT authentication.
- Payday Guardrail dashboard with safe-to-spend, protected essentials, next payday, Money Pressure, confidence and last synced status.
- Demo Bank Connection with Freedom, Watch, Recovery, Student Worker and Renter scenarios.
- Mini Guard preview for quick safe-to-spend status.
- CSV transaction import with backend validation and keyword auto-categorization.
- Payday Setup for current balance, next payday, pay amount, income frequency and confidence.
- Protected Essentials setup for rent, food basics, transport, phone/internet, insurance, debt, subscriptions and emergency buffer.
- Money Pressure Check with Low, Medium, High and Critical levels.
- Freedom Mode, Watch Mode and Recovery Mode based on protected money, safe-to-spend and recovery gap.
- Short Recovery Plan when safe-to-spend or balance goes negative.
- Can I Afford This checker for possible purchases, with mode-aware responses that avoid shame-based language.
- Smart entry workflow for receipt, payslip, bill and CSV uploads with preview before saving.
- Quick-add sentence parser for entries such as "I spent $25 on lunch and $60 on petrol today."
- Searchable transaction table with source and review status.
- Small AI explanations powered by Groq using safe summaries only.
- Daily and monthly AI usage limits to control provider cost and abuse.
- Compact Settings with Account, Security, Payday, Demo Bank, Data & Privacy, AI Settings and Notifications.
- Responsive React UI with light/dark theme support.

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Axios, CSS modules/global styles |
| Backend | Node.js, Express, Zod, Helmet, CORS, express-rate-limit |
| Database | PostgreSQL, Prisma ORM, checked-in migrations |
| Auth | bcrypt password hashing, JWT access tokens |
| AI | Groq SDK |
| Observability | Pino structured logs, optional Sentry |
| Testing | Vitest, React Testing Library, Supertest |
| Deployment | Render/Railway backend config, Vercel frontend config |

## Architecture

```text
React Client
     |
     | REST API calls
     v
Express API
     |
     | Prisma ORM
     v
Prisma ORM
     |
     v
PostgreSQL Database

Express API ---> Groq AI API
Express API ---> Gemini/OCR extraction
Express API ---> Mock Bank Provider
```

The API stores users, chats/messages for small AI explanations, transactions, demo bank data, uploaded-document previews and AI usage records in PostgreSQL. User-owned data is connected through database relations and cascades, so account deletion removes associated records.

Backend services include Auth, Income, Protected Money, Transaction, Demo Bank Provider, Bank Sync, Safe-to-Spend Engine, AI Explanation, Document Extraction, and Privacy / Export / Delete.

Backend calculations are the source of truth. AI explains backend results but does not decide financial values.

Detailed docs:

- [Architecture](docs/ARCHITECTURE.md)
- [System Sequence Diagrams](docs/SSD.md)
- [Data Design](docs/DATA_DESIGN.md)
- [Bank Sync](docs/BANK_SYNC.md)
- [Mockups](docs/MOCKUPS.md)
- [User Flow](docs/USER_FLOW.md)

## Engineering Decisions

- **PostgreSQL + Prisma:** relational finance data benefits from constraints, indexed user ownership, migrations and predictable joins. Prisma keeps the data model explicit and reviewable.
- **JWT authentication:** short-lived access tokens keep the API stateless while still protecting every finance, chat, export and delete route.
- **AI usage limits:** daily and monthly limits are enforced before provider calls to reduce abuse, control cost and make AI behavior more production-aware.
- **Privacy controls:** account export and account deletion are included because finance products must treat user data lifecycle as a first-class feature.
- **AI context tradeoff:** the assistant receives summarized monthly totals and category signals, not raw account identity or unnecessary personal details.
- **CSV import tradeoff:** CSV upload supports a practical fintech workflow without needing real bank integrations or storing bank credentials.
- **Document extraction tradeoff:** the current portfolio version uses a safe extraction preview workflow and confirmation gate. Production OCR/storage would move pending uploads to encrypted object storage with durable database records.

## Local Setup

Requirements:

- Node.js 20+
- Docker Desktop, or a local PostgreSQL 14+ database
- A Groq API key

## Groq AI Setup

BudgetBrain AI uses Groq for AI-powered summaries and financial insights.

Create a Groq API key from Groq Console, then add it to the backend `.env` file:

```env
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-8b-instant
AI_FEATURES_ENABLED=true
AI_DAILY_LIMIT=20
AI_MONTHLY_LIMIT=300
```

Never commit `.env` files or real API keys to GitHub. The React frontend never calls Groq directly; it only calls BudgetBrain backend endpoints such as `/api/ai/chat`, `/api/ai/monthly-diagnosis`, and `/api/ai/action-plan`.

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Install dependencies:

```bash
npm run install:all
```

Create local environment files:

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
```

Update `server/.env`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://budgetbrain:budgetbrain@localhost:5432/budgetbrain?schema=public
JWT_SECRET=replace_with_a_unique_32_character_minimum_secret
GROQ_API_KEY=replace_with_your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
AI_FEATURES_ENABLED=true
CLIENT_URL=http://localhost:5173
SENTRY_DSN=
AI_DAILY_LIMIT=20
AI_MONTHLY_LIMIT=300
LOG_LEVEL=info
```

Apply database migrations:

```bash
npm run db:deploy
```

Run the API and frontend in separate terminals:

```bash
npm run server:dev
npm run client:dev
```

Open the app at:

```text
http://localhost:5173
```

The API health endpoint is:

```text
http://localhost:5000/health
```

## Verification

Run the full test suite from the repository root:

```bash
npm test
```

Build the frontend:

```bash
npm run build
```

Useful targeted commands:

```bash
npm run server:test
npm run client:test
npm run db:migrate -- --name descriptive_migration_name
npm run db:seed
```

The current suite covers authentication, validation, finance endpoints, CSV import, money mode calculations, affordability checks, chat persistence, AI limit behavior, dashboard rendering, auth pages, theme switching, input typing regressions and the mini chatbot.

## Known Limitations / Future Work

- BudgetBrain is not connected to real bank APIs.
- AI responses are educational only and are not professional financial, tax, legal or credit advice.
- CSV auto-categorization is keyword-based and intentionally simple.
- Smart document extraction uses heuristic preview data in this portfolio build; production OCR/model extraction and encrypted file storage are future work.
- Privacy and AI preference settings are implemented as runtime preferences in this build; durable preference storage is a future database migration.
- Current balance is estimated from recorded monthly income and expenses until a real bank-balance integration exists.
- Live demo deployment is still pending.
- Future work includes recurring transactions, richer charts, bank-provider integrations, downloadable reports and deeper AI spending insights.

## Security And Production Notes

- Use a unique 32+ character `JWT_SECRET` in every environment.
- Keep `DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY` and `SENTRY_DSN` out of the Vite client and out of Git.
- Production CORS only allows the configured `CLIENT_URL`.
- AI usage limits are enforced before provider calls to reduce abuse and cost exposure.
- Request validation is handled with Zod schemas.
- Helmet, rate limiting and structured error handling are enabled on the API.
- The included Privacy and Terms pages are drafts and should be reviewed by qualified counsel before public launch.

## Deployment

Backend options:

- Render Blueprint via `render.yaml`
- Railway service via `server/railway.toml`
- Any Node-compatible host with PostgreSQL and environment variables configured

Frontend options:

- Vercel using `client/vercel.json`
- Any static host that can serve the Vite `client/dist` output

Required production variables:

| Variable | Purpose |
|---|---|
| `NODE_ENV=production` | Enables production behavior |
| `PORT` | API listening port |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing secret |
| `GROQ_API_KEY` | AI provider credential |
| `CLIENT_URL` | Exact frontend origin |
| `AI_DAILY_LIMIT` | Per-user daily AI request limit |
| `AI_MONTHLY_LIMIT` | Per-user monthly AI request limit |
| `SENTRY_DSN` | Optional error monitoring |
| `LOG_LEVEL` | API log verbosity |
| `VITE_API_URL` | Frontend API base URL |

## Repository Hygiene

The project intentionally excludes local secrets, generated builds, logs, dependency folders and database exports through `.gitignore`. Demo data should be fictional only.
