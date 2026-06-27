import { cleanCategory } from '../transactionImportService.js';

const now = () => new Date();

const scenarios = {
  freedom: {
    label: 'Freedom Demo',
    balance: 900,
    nextPayday: 'Friday',
    income: { merchant: 'Salary', amount: 1400, frequency: 'weekly' },
    transactions: [
      income('Salary', 1400),
      expense('Rent', 300),
      expense('Woolworths', 82.4),
      expense('Petrol', 65.2),
      expense('Phone bill', 45),
      expense('Netflix', 22.99),
      expense('Cafe', 18.5),
      expense('Loan repayment', 180),
    ],
  },
  watch: {
    label: 'Watch Demo',
    balance: 620,
    nextPayday: 'Friday',
    income: { merchant: 'Salary', amount: 1400, frequency: 'weekly' },
    transactions: [
      income('Salary', 1400),
      expense('Rent', 300),
      expense('Phone bill', 45),
      expense('Loan repayment', 180),
      expense('Fuel estimate', 15),
      expense('Dining', 180),
      expense('Groceries', 120, 'Other'),
      expense('Subscriptions', 55, 'Other'),
    ],
  },
  recovery: {
    label: 'Recovery Demo',
    balance: -180,
    nextPayday: 'Friday',
    income: { merchant: 'Salary', amount: 1400, frequency: 'weekly' },
    transactions: [
      income('Salary', 1400),
      expense('Food basics', 90, 'Groceries'),
      expense('Transport', 70, 'Transport'),
      expense('Overdraft fee', 15, 'Other'),
      expense('Dining', 45),
      expense('Fuel', 60, 'Other'),
      expense('Emergency shortfall', 1400, 'Other'),
    ],
  },
  student: {
    label: 'Student Worker Demo',
    balance: 480,
    nextPayday: 'Thursday',
    income: { merchant: 'Kitchen job payroll', amount: 850, frequency: 'weekly' },
    transactions: [
      income('Kitchen job payroll', 850),
      expense('Room rent', 250),
      expense('Opal transport', 50),
      expense('Aldi groceries', 90),
      expense('Phone bill', 35),
      expense('University study cost', 40, 'Other'),
      expense('Cafe', 28),
    ],
  },
  renter: {
    label: 'Renter Demo',
    balance: 760,
    nextPayday: 'Friday',
    income: { merchant: 'Payroll', amount: 1200, frequency: 'weekly' },
    transactions: [
      income('Payroll', 1200),
      expense('Rent', 420),
      expense('Groceries', 120),
      expense('Transport', 80),
      expense('Electricity bill', 90, 'Bills'),
      expense('Debt repayment', 100),
      expense('Takeaway', 55, 'Dining'),
    ],
  },
};

export function listDemoBankScenarios() {
  return Object.entries(scenarios).map(([id, scenario]) => ({
    id,
    label: scenario.label,
    balance: scenario.balance,
    nextPayday: scenario.nextPayday,
  }));
}

export async function connectDemoBank(scenarioId = 'freedom') {
  return scenarioFor(scenarioId);
}

export async function syncDemoAccounts(connection) {
  return scenarioFor(connection.scenario);
}

export async function getDemoBalances(connection) {
  const scenario = scenarioFor(connection.scenario);
  return [{ id: `demo-${connection.scenario}-spend`, name: 'Demo Everyday Account', balance: scenario.balance }];
}

export async function getDemoTransactions(connection) {
  return scenarioFor(connection.scenario).transactions;
}

export async function disconnectDemoBank() {
  return { disconnected: true };
}

function scenarioFor(scenarioId) {
  const scenario = scenarios[scenarioId] || scenarios.freedom;
  return {
    ...scenario,
    scenario: scenarioId in scenarios ? scenarioId : 'freedom',
    provider: 'mock-bank',
    connectedAt: now(),
    disclaimer: 'This is demo bank data for portfolio/testing only. No real bank account is connected.',
  };
}

function income(merchant, amount) {
  return {
    merchant,
    description: merchant,
    amount,
    type: 'INCOME',
    category: 'Income',
    occurredAt: now(),
  };
}

function expense(merchant, amount, forcedCategory) {
  return {
    merchant,
    description: merchant,
    amount,
    type: 'EXPENSE',
    category: forcedCategory || cleanCategory('', merchant, 'expense'),
    occurredAt: now(),
  };
}
