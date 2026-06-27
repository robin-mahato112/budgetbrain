# Bank Sync

BudgetBrain currently includes a Mock Bank Provider for portfolio and demo review.

This does not connect to a real bank. It simulates bank syncing by importing realistic demo balances, income deposits, rent, food basics, transport, bills, debt repayments, subscriptions and flexible spending.

## Current Implementation

- Mock Bank Provider.
- Demo transactions.
- Demo balance snapshot.
- Demo income detection.
- Demo protected essentials detection through category rules.
- Money Pressure recalculation after sync.
- Demo data is linked to the authenticated user.
- Disconnect removes only the current user's demo bank data.

## Demo Scenarios

- Freedom Demo.
- Watch Demo.
- Recovery Demo.
- Student Worker Demo.
- Renter Demo.

## Data Flow

```text
Demo Bank Provider
  v
Bank Sync Service
  v
Normalise Transactions
  v
Detect Income + Protected Essentials
  v
Safe-to-Spend Engine
  v
Money Pressure Engine
  v
Dashboard + Mini Guard
```

## Provider Interface

```text
connectBank(userId, scenario)
syncAccounts(userId)
getBalances(userId)
getTransactions(userId)
disconnectBank(userId)
```

## Future Implementation

- Replace Mock Bank Provider with an Open Banking / CDR provider.
- Keep the same bankSyncService interface.
- Use consent-based bank data access.
- Never store bank credentials directly.
- Store provider tokens securely if a real provider requires them.
