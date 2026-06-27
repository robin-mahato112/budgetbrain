# System Sequence Diagrams

## SSD: Demo Bank Sync

```text
User
  v
Clicks Connect Demo Bank
  v
React Frontend
  v
POST /api/demo-bank/connect
  v
Express Backend
  v
Mock Bank Provider returns demo balance + transactions
  v
Backend normalises transactions
  v
Backend detects income and protected costs
  v
Backend calculates safe-to-spend
  v
PostgreSQL stores user-owned demo data
  v
Backend returns dashboard summary
  v
React updates dashboard + Mini Guard preview
```

## SSD: Safe-to-Spend Calculation

```text
User opens dashboard
  v
React requests dashboard summary
  v
Backend loads user balance, income, protected costs and transactions
  v
Safe-to-Spend Engine calculates:
current balance + confirmed income before payday - protected money before payday
  v
Backend calculates money mode and confidence level
  v
Dashboard displays Safe to Spend / Recovery Gap
```

## SSD: Can I Afford This?

```text
User enters purchase amount
  v
React sends amount to backend
  v
Backend loads latest money summary
  v
Backend calculates after-purchase safe-to-spend
  v
Backend returns safe / watch / recovery result
  v
Optional Groq explanation is generated from safe summary
  v
Frontend shows answer
```

## SSD: Money Pressure Calculation

```text
Dashboard requests summary
  v
Backend loads balance, income, protected essentials and transactions
  v
Safe-to-Spend Engine calculates safe-to-spend and recovery gap
  v
Money Pressure Engine checks low safe amount, negative balance, protected essentials and data confidence
  v
Backend returns Low / Medium / High / Critical pressure plus one action
  v
Dashboard and Mini Guard display pressure calmly
```

## SSD: Smart Add

```text
User types natural sentence
  v
Frontend sends text to backend
  v
Backend parser / AI extracts transaction candidates
  v
Frontend shows preview
  v
User confirms
  v
Transactions are saved
  v
Dashboard recalculates
```

## SSD: Profile Menu To Account Settings

```text
User clicks profile name/icon
  v
Compact account menu opens
  v
User selects Account settings, Profile, Security or Privacy
  v
React routes to Settings with the matching section
  v
Settings displays compact account controls
```
