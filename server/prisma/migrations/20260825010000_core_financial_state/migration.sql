ALTER TABLE "User"
  ADD COLUMN "currentBalance" DECIMAL(12,2),
  ADD COLUMN "expectedIncome" DECIMAL(12,2),
  ADD COLUMN "incomeFrequency" VARCHAR(20) NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN "safetyBuffer" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "ProtectedCost" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "recurringPatternId" UUID,
  "name" VARCHAR(120) NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "classification" VARCHAR(30) NOT NULL DEFAULT 'FIXED',
  "amount" DECIMAL(12,2) NOT NULL,
  "originalAmount" DECIMAL(16,4),
  "currency" VARCHAR(3) NOT NULL DEFAULT 'AUD',
  "exchangeRate" DECIMAL(18,10),
  "rateDate" DATE,
  "frequency" VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME',
  "nextDueDate" DATE NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProtectedCost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProtectedCost_userId_enabled_nextDueDate_idx" ON "ProtectedCost"("userId", "enabled", "nextDueDate");
CREATE INDEX "ProtectedCost_recurringPatternId_idx" ON "ProtectedCost"("recurringPatternId");
ALTER TABLE "ProtectedCost" ADD CONSTRAINT "ProtectedCost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProtectedCost" ADD CONSTRAINT "ProtectedCost_recurringPatternId_fkey" FOREIGN KEY ("recurringPatternId") REFERENCES "RecurringTransactionPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;
