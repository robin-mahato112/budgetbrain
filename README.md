# BudgetBrain AI

BudgetBrain AI is a full-stack personal finance workspace for budgeting, debt planning, savings goals, bill splitting and AI-assisted financial education. It is built as a production-minded portfolio project with authenticated user accounts, persistent financial data, guarded AI usage and automated tests across the API and React app.

> BudgetBrain is an educational tool, not a licensed financial adviser. AI responses and calculator outputs should be verified before making financial decisions.

## Why this project matters

BudgetBrain demonstrates the kind of product engineering expected in a real SaaS codebase: secure authentication, relational data modeling, validation, rate limiting, error handling, privacy controls, automated verification, deployment configuration and a polished responsive interface. The goal is not just to show screens, but to show a maintainable path from local development to production deployment.

## Product Preview

### Login

![BudgetBrain login screen](docs/screenshots/login.png)

### Dashboard And AI Assistant

![BudgetBrain dark dashboard with summary cards and AI assistant](docs/screenshots/dashboard-dark.png)

### Budget Tracker

![BudgetBrain budget tracker](docs/screenshots/budget-tracker.png)

### Savings Goals

![BudgetBrain savings goals page](docs/screenshots/savings-goals.png)

![BudgetBrain dark savings goal modal](docs/screenshots/savings-modal-dark.png)

### Debt Payoff

![BudgetBrain debt payoff calculator](docs/screenshots/debt-payoff.png)

### Bill Splitter

![BudgetBrain bill splitter](docs/screenshots/bill-splitter.png)

### Chat History And Settings

![BudgetBrain chat history page](docs/screenshots/chat-history.png)

![BudgetBrain settings page](docs/screenshots/settings.png)

![BudgetBrain settings profile and data export cards](docs/screenshots/settings-overview.png)

![BudgetBrain settings delete account section](docs/screenshots/settings-delete-account.png)

## Core Features

- Secure registration, login and protected routes with JWT authentication.
- Personal dashboard with income, expenses, savings, debt, spending breakdowns and recent activity.
- Budget tracking by category and month.
- Transaction capture for income, expenses and savings.
- Savings goal planning with progress tracking.
- Debt payoff calculator and debt record management.
- Bill splitter for shared expenses.
- AI finance assistant powered by Groq with persisted chat history.
- Daily and monthly AI usage limits to control provider cost and abuse.
- Privacy, terms, account export and account deletion flows.
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
client/
  React app, protected routes, pages, reusable UI components, services and tests

server/
  Express API, controllers, middleware, Prisma schema/migrations, validation and tests

docker-compose.yml
  Local PostgreSQL service for development

```

The API stores users, chats, messages, budgets, transactions, savings goals, debts and AI usage records in PostgreSQL. User-owned data is connected through database relations and cascades, so account deletion removes associated records.

## Local Setup

Requirements:

- Node.js 20+
- Docker Desktop, or a local PostgreSQL 14+ database
- A Groq API key

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
CLIENT_URL=http://localhost:5173
SENTRY_DSN=
AI_DAILY_LIMIT=25
AI_MONTHLY_LIMIT=500
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

The current suite covers authentication, validation, finance endpoints, chat persistence, AI limit behavior, dashboard rendering, auth pages, theme switching and the mini chatbot.

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
