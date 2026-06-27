# Data Design

## User

```text
id
name
email
passwordHash
createdAt
updatedAt
```

## IncomeSource

Currently represented by income transactions and payslip-confirmed entries. Future dedicated model:

```text
id
userId
name
amount
frequency
nextPayDate
incomeType
confidenceStatus
createdAt
updatedAt
```

Example:

```text
Main job - $1,400 weekly - confirmed
Cleaning job - $250 one-time - expected
```

## ProtectedCost / Protected Essential

Currently inferred from categorized essential transactions. Future dedicated model:

```text
id
userId
name
amount
frequency
nextDueDate
category
isEssential
createdAt
updatedAt
```

Example:

```text
Rent - $300 weekly - Housing
Fuel - $70 weekly - Transport
Phone - $45 monthly - Bills
Loan repayment - $180 monthly - Debt
```

## Transaction

```text
id
userId
date / occurredAt
description
merchant
amount
type
category
source
needsReview
createdAt
updatedAt
```

Sources:

```text
manual
quick_add
csv
demo_bank
demo_balance
ai_document
receipt_upload
```

## MoneySnapshot / DashboardSummary

Calculated from user-owned income, protected costs and transactions:

```text
id
userId
currentBalance
protectedBeforePayday
confirmedIncomeBeforePayday
safeToSpend
recoveryGap
moneyMode
moneyPressure
confidenceLevel
lastUpdatedAt
```

## DemoBankConnection

```text
id
userId
provider
scenario
status
lastSyncedAt
createdAt
updatedAt
```

Current implementation stores demo sync state through user-owned demo transactions and a demo balance snapshot. A future production version can promote this to a dedicated durable model.

## UploadedDocument

The current portfolio version keeps upload previews pending until confirmation. Future durable model:

```text
id
userId
documentType
fileName
fileType
status
extractedData
confirmed
createdAt
updatedAt
```

## AIUsage

```text
id
userId
date
monthlyKey
requestCount
createdAt
updatedAt
```

## NotificationPreference

```text
id
userId
lowSafeToSpendAlert
recoveryModeAlert
paydayReminder
billDueReminder
dataOutdatedReminder
createdAt
updatedAt
```

## Relationships

```text
User has many IncomeSources
User has many ProtectedCosts
User has many Transactions
User has many UploadedDocuments
User has many AIUsage records
User has notification preferences
DashboardSummary is calculated from user-owned income, protected costs and transactions
```

## Privacy Rule

Every financial record must belong to one authenticated user. Users must never access another user's income, transactions, documents or summaries.
