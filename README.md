# BudgetBrain

BudgetBrain is a full-stack payday guardrail that helps people understand how much money is genuinely safe to spend before their next payday.

Bank balances alone do not account for rent, food, transport, bills, debt, or other essentials. BudgetBrain protects those commitments first and then calculates a practical safe-to-spend amount.

> BudgetBrain is an educational tool, not a licensed financial adviser. Its AI features explain application calculations and do not provide professional financial advice.

## Core calculation

```text
Safe to Spend = Current Balance
              + Confirmed Income Before Payday
              - Protected Money Before Payday
```

The backend is the source of truth for all financial calculations. AI is used only to explain the results in plain language.

For a local seeded demo, use `demo@budgetbrain.local` with password `DemoPassword123` after running `npm run db:seed`. All demo financial data is fictional.

## Preview

![BudgetBrain dashboard in dark mode](docs/screenshots/dashboard-dark.png)

<details>
  <summary>More screenshots</summary>

  ### Budget tracker

  ![Budget tracker](docs/screenshots/budget-tracker.png)

  ### Savings goals

  ![Savings goals](docs/screenshots/savings-goals.png)

  ### Debt payoff

  ![Debt payoff](docs/screenshots/debt-payoff.png)

  ### Settings

  ![Settings](docs/screenshots/settings-overview.png)
</details>

## Features

- Secure registration and login with JWT authentication and bcrypt password hashing
- Payday setup for balance, expected income, pay frequency, and next payday
- Protected essentials for housing, food, transport, bills, debt, subscriptions, and buffers
- Safe-to-spend and money-pressure calculations performed by the backend
- Freedom, Watch, and Recovery modes with an actionable recovery plan
- Demo bank connection with realistic scenarios and fictional transaction data
- “Can I afford this?” purchase checks based on the user's current financial position
- CSV transaction import with validation and keyword-based categorisation
- Smart entry previews for receipts, payslips, bills, and quick-add sentences
- Searchable transaction history with source and review status
- AI explanations with daily and monthly usage limits
- Data export and account deletion controls
- Responsive light and dark themes
- Flexible CSV preview, column mapping, validation, and duplicate detection
- Optional YNAB sync with encrypted server-side token storage
- Multi-currency protected items with cached exchange-rate fallback
- Public-holiday payday warnings that require user confirmation
- Recurring-payment detection with user-controlled protection status

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Axios, Lucide React |
| Backend | Node.js, Express, Zod, Helmet, Pino |
| Database | PostgreSQL, Prisma ORM |
| Authentication | JWT, bcrypt |
| AI | Groq; optional Gemini document extraction |
| Testing | Vitest, React Testing Library, Supertest |
| Deployment | Vercel, Render, Railway, Docker Compose |

## Architecture

```mermaid
flowchart TD
    DEMO[Demo Bank] --> N[Transaction Normalizer]
    YNAB[YNAB] --> N
    CSV[Bank CSV] --> N
    N --> C[Deterministic Categorisation]
    C --> R[Recurring Payment Detection]
    R --> S[Safe-to-Spend Engine]
    FX[Cached Currency Rates] --> S
    H[Cached Public Holidays] --> P[Payday Forecast]
    P --> S
    E[Protected Essentials] --> S
    S --> D[Dashboard]
```

The API owns authentication, finance calculations, transaction imports, demo-bank synchronisation, AI usage enforcement, and privacy operations. User-owned records are connected through relational constraints and cascade when an account is deleted.

## Financial sources

All provider data passes through one normalized transaction contract before categorisation or calculation. Provider-specific amounts, dates, deleted records, accounts, currencies, and identifiers do not leak into the safe-to-spend engine.

### Demo Bank

Demo Bank uses fictional scenarios and requires no third-party account. It is clearly labelled as simulated data and never asks for bank credentials.

### YNAB

YNAB is optional. Backend OAuth lists available YNAB plans as budgets, imports accounts and transactions, and supports incremental sync through YNAB server knowledge. Tokens are encrypted before storage and never returned to the client.

Create a YNAB OAuth application, configure its callback to match `YNAB_REDIRECT_URI`, and set:

```env
YNAB_CLIENT_ID=
YNAB_CLIENT_SECRET=
YNAB_REDIRECT_URI=http://localhost:5000/api/integrations/ynab/callback
INTEGRATION_ENCRYPTION_KEY=replace_with_a_unique_secret_of_at_least_32_characters
```

Without these credentials, BudgetBrain continues to work and shows YNAB as unconfigured.

### Bank CSV

CSV import detects common Date, Description, Amount, Debit, Credit, Category, Currency, and Account headers. Unfamiliar files display a mapping UI. The preview reports total, valid, duplicate, and invalid rows; invalid rows are shown rather than silently discarded.

## Currency conversion

Users choose a base currency and can enter protected items in another currency. BudgetBrain preserves the original amount and currency, conversion rate, converted amount, and rate date. Rates are fetched behind a provider abstraction and cached in PostgreSQL. A recent cached rate is used when the provider is unavailable and stale conversions are marked as estimated.

## Payday and public holidays

Payday dates are checked through a cached holiday-provider abstraction for the user's country. A holiday never changes payday automatically. BudgetBrain asks whether pay normally arrives on the previous business day, next business day, same date, or should be confirmed manually.

## Safe-to-Spend calculation

The central financial-state service is the authoritative backend calculation path. It uses the persisted current balance and next payday, projects enabled protected-cost occurrences only through that payday, subtracts fixed and adjustable essentials plus the safety buffer, and counts recurring candidates only after the user marks them protected. Merchant, amount, date, and explicit pattern links prevent the same obligation being counted twice. A negative result is preserved as a shortfall and activates Recovery Mode.

The dashboard consumes `GET /api/finance/financial-state`. Payday setup, protected-cost CRUD, transaction CRUD, and recurring-payment decisions all persist first and then refresh this same state, so dashboard amounts, pressure, recovery guidance, and confidence stay consistent.

More detailed design documentation is available in [`docs`](docs):

- [Architecture](docs/ARCHITECTURE.md)
- [System sequence diagrams](docs/SSD.md)
- [Data design](docs/DATA_DESIGN.md)
- [Bank sync design](docs/BANK_SYNC.md)
- [User flow](docs/USER_FLOW.md)
- [UI mockups](docs/MOCKUPS.md)

## Getting started

### Prerequisites

- Node.js 20 or newer
- Docker Desktop, or PostgreSQL 14 or newer
- A Groq API key only if you want to use AI explanations
- A Gemini API key only if you want to use Gemini-powered document extraction

### 1. Clone and install

```bash
git clone https://github.com/robin-mahato112/budgetbrain.git
cd budgetbrain
npm run install:all
```

### 2. Configure the environment

Copy the example files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

On Windows Command Prompt, use:

```bat
copy server\.env.example server\.env
copy client\.env.example client\.env
```

At minimum, set these backend values in `server/.env`:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://budgetbrain:budgetbrain@localhost:5432/budgetbrain?schema=public
JWT_SECRET=replace_with_a_unique_secret_of_at_least_32_characters
```

AI integrations are optional. To enable them, add the appropriate keys:

```env
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
AI_FEATURES_ENABLED=true
AI_DAILY_LIMIT=20
AI_MONTHLY_LIMIT=300
```

Optional financial-data services:

```env
SERVER_URL=http://localhost:5000
INTEGRATION_ENCRYPTION_KEY=
YNAB_CLIENT_ID=
YNAB_CLIENT_SECRET=
YNAB_REDIRECT_URI=http://localhost:5000/api/integrations/ynab/callback
CURRENCY_API_URL=https://api.frankfurter.app
HOLIDAY_API_URL=https://date.nager.at/api/v3
```

Never expose backend secrets through `VITE_*` variables or commit `.env` files.

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

If you use an existing PostgreSQL installation instead, update `DATABASE_URL` accordingly.

### 4. Apply migrations

```bash
npm run db:deploy
```

Optional fictional demo data can be added with:

```bash
npm run db:seed
```

### 5. Run the application

Start the API and client in separate terminals:

```bash
npm run server:dev
```

```bash
npm run client:dev
```

Then open [http://localhost:5173](http://localhost:5173). The API health endpoint is available at [http://localhost:5000/health](http://localhost:5000/health).

## Available scripts

Run these commands from the repository root.

| Command | Purpose |
| --- | --- |
| `npm run install:all` | Install server and client dependencies |
| `npm run server:dev` | Start the API with automatic reload |
| `npm run client:dev` | Start the Vite development server |
| `npm run db:deploy` | Apply checked-in Prisma migrations |
| `npm run db:migrate -- --name <name>` | Create a development migration |
| `npm run db:seed` | Load fictional seed data |
| `npm test` | Run server and client test suites |
| `npm run server:test` | Run backend tests |
| `npm run client:test` | Run frontend tests |
| `npm run build` | Build the production frontend |

## Testing and verification

Run the full automated test suite:

```bash
npm test
```

Create a production frontend build:

```bash
npm run build
```

The test suite covers authentication, ownership and request validation, positive/zero/negative safe-to-spend states, payday windows, safety buffers, obligation deduplication, recurring protection decisions, confidence and pressure levels, transaction normalization, CSV debit/credit handling, recurrence detection, currency caching and fallback, holiday payday choices, affordability checks, AI limits, and key dashboard flows.

## Security and privacy

- Authentication-protected routes and user-scoped database queries
- Password hashing with configurable bcrypt rounds
- Zod validation for API input
- Helmet security headers, CORS restrictions, and rate limiting
- AI request limits to control cost and abuse
- Summarised financial context sent to AI providers instead of unnecessary identity data
- Account export and deletion endpoints
- Encrypted-at-rest integration token structure with no token logging or frontend exposure
- User-scoped connections, imports, accounts, transactions, category rules, and recurrence patterns
- Optional Sentry integration and structured Pino logging

For production, use unique secrets, restrict `CLIENT_URL` to the deployed frontend origin, configure HTTPS, and review the included privacy and terms drafts with qualified counsel.

## Deployment

The repository includes deployment configuration for:

- Vercel: [`client/vercel.json`](client/vercel.json)
- Render: [`render.yaml`](render.yaml)
- Railway: [`server/railway.toml`](server/railway.toml)
- Docker Compose for local PostgreSQL: [`docker-compose.yml`](docker-compose.yml)

Production deployments must provide `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, and the relevant optional AI and observability variables. The frontend should set `VITE_API_URL` to the public API origin.

## Current limitations

- The included bank connection is simulated and does not connect to real financial institutions.
- Current balance is entered during payday setup or supplied by the simulated Demo Bank; no real bank-balance provider is included.
- Deterministic categorisation is intentionally rule-based; ambiguous items require review.
- YNAB depends on user-supplied OAuth credentials and is not an Open Banking integration.
- Currency and holiday data depend on external public providers; cached data is used when possible.
- Document extraction uses a preview-and-confirm workflow; durable encrypted object storage is not included.
- AI/privacy preferences other than base currency and holiday country remain runtime-only.
- AI output is educational and may be unavailable when provider keys are not configured.

## License

No open-source licence is currently included. Unless a licence is added, the repository's source code remains subject to standard copyright restrictions.
