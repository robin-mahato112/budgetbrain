CREATE TYPE "FinancialProvider" AS ENUM ('DEMO_BANK', 'YNAB', 'CSV');
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEW', 'COMPLETED', 'PARTIAL', 'DELETED');

ALTER TABLE "User"
  ADD COLUMN "baseCurrency" VARCHAR(3) NOT NULL DEFAULT 'AUD',
  ADD COLUMN "countryCode" VARCHAR(2) NOT NULL DEFAULT 'AU',
  ADD COLUMN "nextPayday" DATE,
  ADD COLUMN "paydayConfirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "holidayPaydayRule" VARCHAR(30);

ALTER TABLE "Transaction"
  ADD COLUMN "externalId" VARCHAR(191),
  ADD COLUMN "accountName" VARCHAR(120),
  ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'AUD',
  ADD COLUMN "originalAmount" DECIMAL(16,4),
  ADD COLUMN "originalCurrency" VARCHAR(3),
  ADD COLUMN "exchangeRate" DECIMAL(18,10),
  ADD COLUMN "rateDate" DATE,
  ADD COLUMN "fingerprint" VARCHAR(64),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "importId" UUID,
  ADD COLUMN "externalAccountId" UUID;

CREATE TABLE "FinancialConnection" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "provider" "FinancialProvider" NOT NULL,
  "status" "ConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED', "externalId" VARCHAR(191),
  "displayName" VARCHAR(120), "encryptedAccessToken" TEXT, "encryptedRefreshToken" TEXT,
  "tokenExpiresAt" TIMESTAMP(3), "selectedBudgetId" VARCHAR(191), "syncCursor" VARCHAR(191),
  "lastSyncedAt" TIMESTAMP(3), "lastError" VARCHAR(500), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalAccount" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "connectionId" UUID NOT NULL, "externalId" VARCHAR(191) NOT NULL,
  "name" VARCHAR(120) NOT NULL, "currency" VARCHAR(3) NOT NULL DEFAULT 'AUD', "closed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransactionImport" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "fileName" VARCHAR(255) NOT NULL, "fingerprint" VARCHAR(64) NOT NULL,
  "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEW', "totalRows" INTEGER NOT NULL, "validRows" INTEGER NOT NULL DEFAULT 0,
  "duplicateRows" INTEGER NOT NULL DEFAULT 0, "invalidRows" INTEGER NOT NULL DEFAULT 0, "mapping" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "TransactionImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransactionImportRow" (
  "id" UUID NOT NULL, "importId" UUID NOT NULL, "rowNumber" INTEGER NOT NULL, "rawData" JSONB NOT NULL,
  "status" VARCHAR(20) NOT NULL, "error" VARCHAR(500), "fingerprint" VARCHAR(64),
  CONSTRAINT "TransactionImportRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserCategoryRule" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "merchantKey" VARCHAR(120) NOT NULL, "category" VARCHAR(40) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserCategoryRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringTransactionPattern" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "merchantKey" VARCHAR(120) NOT NULL, "description" VARCHAR(120) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL, "currency" VARCHAR(3) NOT NULL DEFAULT 'AUD', "cadence" VARCHAR(20) NOT NULL,
  "nextExpectedAt" DATE NOT NULL, "confidence" DECIMAL(4,3) NOT NULL, "protectionStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringTransactionPattern_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurrencyRate" (
  "id" UUID NOT NULL, "sourceCurrency" VARCHAR(3) NOT NULL, "targetCurrency" VARCHAR(3) NOT NULL,
  "rate" DECIMAL(18,10) NOT NULL, "rateDate" DATE NOT NULL, "provider" VARCHAR(40) NOT NULL,
  "estimated" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HolidayCache" (
  "id" UUID NOT NULL, "countryCode" VARCHAR(2) NOT NULL, "holidayDate" DATE NOT NULL, "name" VARCHAR(120) NOT NULL,
  "provider" VARCHAR(40) NOT NULL, "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HolidayCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Transaction_userId_source_externalId_key" ON "Transaction"("userId", "source", "externalId");
CREATE INDEX "Transaction_userId_fingerprint_idx" ON "Transaction"("userId", "fingerprint");
CREATE INDEX "Transaction_importId_idx" ON "Transaction"("importId");
CREATE UNIQUE INDEX "FinancialConnection_userId_provider_key" ON "FinancialConnection"("userId", "provider");
CREATE INDEX "FinancialConnection_userId_status_idx" ON "FinancialConnection"("userId", "status");
CREATE UNIQUE INDEX "ExternalAccount_connectionId_externalId_key" ON "ExternalAccount"("connectionId", "externalId");
CREATE INDEX "ExternalAccount_userId_idx" ON "ExternalAccount"("userId");
CREATE UNIQUE INDEX "TransactionImport_userId_fingerprint_key" ON "TransactionImport"("userId", "fingerprint");
CREATE INDEX "TransactionImport_userId_createdAt_idx" ON "TransactionImport"("userId", "createdAt");
CREATE UNIQUE INDEX "TransactionImportRow_importId_rowNumber_key" ON "TransactionImportRow"("importId", "rowNumber");
CREATE UNIQUE INDEX "UserCategoryRule_userId_merchantKey_key" ON "UserCategoryRule"("userId", "merchantKey");
CREATE UNIQUE INDEX "RecurringTransactionPattern_userId_merchantKey_cadence_key" ON "RecurringTransactionPattern"("userId", "merchantKey", "cadence");
CREATE INDEX "RecurringTransactionPattern_userId_nextExpectedAt_idx" ON "RecurringTransactionPattern"("userId", "nextExpectedAt");
CREATE UNIQUE INDEX "CurrencyRate_sourceCurrency_targetCurrency_rateDate_key" ON "CurrencyRate"("sourceCurrency", "targetCurrency", "rateDate");
CREATE INDEX "CurrencyRate_sourceCurrency_targetCurrency_rateDate_idx" ON "CurrencyRate"("sourceCurrency", "targetCurrency", "rateDate");
CREATE UNIQUE INDEX "HolidayCache_countryCode_holidayDate_name_key" ON "HolidayCache"("countryCode", "holidayDate", "name");
CREATE INDEX "HolidayCache_countryCode_holidayDate_idx" ON "HolidayCache"("countryCode", "holidayDate");

ALTER TABLE "FinancialConnection" ADD CONSTRAINT "FinancialConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalAccount" ADD CONSTRAINT "ExternalAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalAccount" ADD CONSTRAINT "ExternalAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FinancialConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionImport" ADD CONSTRAINT "TransactionImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionImportRow" ADD CONSTRAINT "TransactionImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "TransactionImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCategoryRule" ADD CONSTRAINT "UserCategoryRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionPattern" ADD CONSTRAINT "RecurringTransactionPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "TransactionImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_externalAccountId_fkey" FOREIGN KEY ("externalAccountId") REFERENCES "ExternalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
