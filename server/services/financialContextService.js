import { cleanCategory } from './transactionImportService.js';

const number = (value) => Number(value || 0);

export function monthBounds(value = new Date()) {
  const start = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  const end = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1));
  return { start, end };
}

const essentialCategories = new Set(['Groceries', 'Housing', 'Transport', 'Bills', 'Insurance', 'Debt']);
const lifestyleCategories = new Set(['Dining', 'Subscriptions', 'Other']);
const committedCategories = new Set(['Housing', 'Bills', 'Subscriptions', 'Insurance']);
const reviewCategories = ['Uncategorised', 'Mixed / Needs Review'];

export function buildMonthlyInsights(transactions, options = {}) {
  const previousTransactions = options.previousTransactions || [];
  const debts = options.debts || [];
  const goals = options.goals || [];
  const balanceSnapshot = latestBalanceSnapshot(transactions);
  const incomeItems = transactions.filter((item) => item.type === 'INCOME');
  const expenseItems = transactions
    .filter((item) => item.type === 'EXPENSE')
    .map((item) => ({ ...item, category: cleanCategory(item.category, item.description || item.merchant, 'expense') }));
  const monthlyIncome = incomeItems.reduce((sum, item) => sum + number(item.amount), 0);
  const monthlyExpenses = expenseItems.reduce((sum, item) => sum + number(item.amount), 0);
  const previousExpenses = previousTransactions.filter((item) => item.type === 'EXPENSE').reduce((sum, item) => sum + number(item.amount), 0);
  const byCategory = new Map();

  for (const item of expenseItems) {
    byCategory.set(item.category, (byCategory.get(item.category) || 0) + number(item.amount));
  }

  const reviewCategoryAmount = reviewCategories.reduce((sum, category) => sum + (byCategory.get(category) || 0), 0);
  const cleanCategoryEntries = [...byCategory.entries()].filter(([category]) => !reviewCategories.includes(category));
  const topCategoryEntry = cleanCategoryEntries.sort((a, b) => b[1] - a[1])[0] || ['None', 0];
  const highest = [...incomeItems, ...expenseItems].sort((a, b) => number(b.amount) - number(a.amount))[0] || null;
  const topCategoryShare = monthlyExpenses > 0 ? topCategoryEntry[1] / monthlyExpenses : 0;
  const essentialsSpending = sumCategories(byCategory, essentialCategories);
  const lifestyleSpending = sumCategories(byCategory, lifestyleCategories);
  const debtCategorySpending = sumCategories(byCategory, new Set(['Debt']));
  const debtRepayments = debtCategorySpending + debts.reduce((sum, debt) => sum + number(debt.minimumPayment), 0);
  const savingsContribution = transactions.filter((item) => item.type === 'SAVING').reduce((sum, item) => sum + number(item.amount), 0);
  const emergencySavings = goals
    .filter((goal) => /emergency|buffer|rainy|safety/i.test(goal.name || ''))
    .reduce((sum, goal) => sum + number(goal.current), 0) || goals.reduce((sum, goal) => sum + number(goal.current), 0);
  const essentialDaily = essentialsSpending > 0 ? essentialsSpending / 30 : 0;
  const emergencyDays = essentialDaily > 0 ? Math.floor(emergencySavings / essentialDaily) : 0;
  const oneMonthBufferGap = Math.max(0, essentialsSpending - emergencySavings);
  const committedBeforePayday = sumCategories(byCategory, committedCategories);
  const spendingChangePercent = previousExpenses > 0 ? Number((((monthlyExpenses - previousExpenses) / previousExpenses) * 100).toFixed(1)) : 0;
  const moneyLeaks = detectMoneyLeaks(expenseItems, previousTransactions);
  const debtPressure = buildDebtPressure({ debts, monthlyIncome, debtRepayments });
  const moneyMode = buildMoneyMode({
    currentBalance: options.currentBalance ?? balanceSnapshot?.balance ?? monthlyIncome - monthlyExpenses,
    essentialsSpending,
    debtRepayments,
    debtCategorySpending,
    committedBeforePayday,
    emergencyDays,
    monthlyIncome,
    monthlyExpenses,
    spendingChangePercent,
    moneyLeaks,
    debtPressure,
    hasExpenseData: expenseItems.length > 0,
    nextPayday: options.nextPayday ?? balanceSnapshot?.nextPayday ?? 'Not set',
  });
  const confidence = buildConfidenceLevel({ transactions, moneyMode, balanceSnapshot });
  const moneyPressure = buildMoneyPressure({ moneyMode, confidence, monthlyIncome, monthlyExpenses, moneyLeaks, debtPressure });
  const health = buildFinancialHealth({
    monthlyIncome,
    monthlyExpenses,
    debtRepayments,
    emergencyDays,
    committedBeforePayday,
    categoryWarning: topCategoryShare >= 0.35 && topCategoryEntry[1] > 0,
  });

  return {
    monthlyIncome,
    monthlyExpenses,
    netSavings: monthlyIncome - monthlyExpenses,
    essentialsSpending,
    lifestyleSpending,
    debtRepayments,
    savingsContribution,
    spendingChangePercent,
    topSpendingCategory: { category: topCategoryEntry[0], amount: topCategoryEntry[1], share: Number((topCategoryShare * 100).toFixed(1)) },
    safeToSpendFormula: 'Safe to Spend = Current Balance + Confirmed Income Before Payday - Protected Money Before Payday',
    confidence,
    moneyPressure,
    demoBank: buildDemoBankStatus(transactions, balanceSnapshot),
    needsReviewTransactions: expenseItems.filter((item) => reviewCategories.includes(item.category)).length,
    highestTransaction: highest ? {
      merchant: highest.merchant,
      amount: number(highest.amount),
      type: highest.type.toLowerCase(),
      category: highest.category,
      occurredAt: highest.occurredAt,
    } : null,
    importedTransactions: transactions.filter((item) => item.source === 'csv').length,
    moneyMode,
    categoryWarning: buildCategoryWarning({ monthlyExpenses, topCategoryEntry, topCategoryShare, reviewCategoryAmount, protectedMoneyMissing: moneyMode.protectedMoneyMissing }),
    financialHealth: health,
    moneyLeaks,
    futureCashflow: {
      committedBeforePayday,
      items: [
        { label: 'Rent and housing', amount: byCategory.get('Housing') || 0 },
        { label: 'Debt repayments', amount: byCategory.get('Debt') || debtRepayments },
        { label: 'Subscriptions', amount: byCategory.get('Subscriptions') || 0 },
        { label: 'Phone and bills', amount: byCategory.get('Bills') || 0 },
        { label: 'Insurance', amount: byCategory.get('Insurance') || 0 },
      ].filter((item) => item.amount > 0),
      warning: monthlyIncome > 0 && committedBeforePayday / monthlyIncome >= 0.35
        ? `${committedBeforePayday.toFixed(0)} is already committed before payday.`
        : '',
    },
    debtPressure,
    emergencyBuffer: {
      current: emergencySavings,
      essentialMonthly: essentialsSpending,
      daysCovered: emergencyDays,
      monthsCovered: essentialDaily > 0 ? Number((emergencyDays / 30).toFixed(1)) : 0,
      milestoneDays: 30,
      oneMonthGap: oneMonthBufferGap,
      message: essentialDaily > 0
        ? `You can cover ${emergencyDays} days of essential expenses.`
        : 'Add essential expenses to estimate your emergency buffer.',
    },
  };
}

export function buildAiFinancialContext(transactions, options = {}) {
  const insights = buildMonthlyInsights(transactions, options);
  return [
    'User financial context for the current UTC month. Do not reveal or infer personal identity.',
    `Mode: ${insights.moneyMode.name}`,
    `Mode message: ${insights.moneyMode.message}`,
    `Income: ${insights.monthlyIncome.toFixed(2)}`,
    `Expenses: ${insights.monthlyExpenses.toFixed(2)}`,
    `Net savings: ${insights.netSavings.toFixed(2)}`,
    `Current balance: ${insights.moneyMode.currentBalance.toFixed(2)}`,
    `Protected money: ${insights.moneyMode.protectedMoney.toFixed(2)}`,
    `Safe to spend: ${insights.moneyMode.guiltFreeSpending.toFixed(2)}`,
    `Recovery gap: ${insights.moneyMode.recoveryGap.toFixed(2)}`,
    `Confidence: ${insights.confidence.level}`,
    `Money pressure: ${insights.moneyPressure.level}`,
    `Money pressure reason: ${insights.moneyPressure.reason}`,
    `Essentials spending: ${insights.essentialsSpending.toFixed(2)}`,
    `Lifestyle spending: ${insights.lifestyleSpending.toFixed(2)}`,
    `Debt repayments: ${insights.debtRepayments.toFixed(2)}`,
    `Emergency buffer: ${insights.emergencyBuffer.daysCovered} days`,
    `Upcoming committed payments: ${insights.futureCashflow.committedBeforePayday.toFixed(2)}`,
    `Financial health: ${insights.financialHealth.status}`,
    `Top spending category: ${insights.topSpendingCategory.category} (${insights.topSpendingCategory.amount.toFixed(2)}, ${insights.topSpendingCategory.share}%)`,
    `Highest transaction: ${insights.highestTransaction ? `${insights.highestTransaction.merchant}, ${insights.highestTransaction.amount.toFixed(2)}, ${insights.highestTransaction.category}` : 'None'}`,
    `Imported transaction count: ${insights.importedTransactions}`,
    `Money leak summary: ${insights.moneyLeaks.map((item) => item.title).join('; ') || 'none'}`,
    `Survival priorities: ${insights.moneyMode.survivalPriorities.join(', ')}`,
    insights.categoryWarning ? `Warning: ${insights.categoryWarning}` : 'Warning: none',
    'Use this data only for general educational budgeting guidance. Do not provide financial product recommendations.',
  ].join('\n');
}

export function evaluatePurchase(insights, purchase) {
  const amount = Math.max(0, number(purchase.amount));
  const category = String(purchase.category || '').trim() || 'this purchase';
  const mode = insights.moneyMode;

  if (!amount) {
    return {
      ok: false,
      mode: mode.name,
      message: 'Enter a purchase amount greater than zero.',
      remainingGuiltFree: mode.guiltFreeSpending,
      recoveryGap: mode.recoveryGap,
    };
  }

  if (mode.name === 'Recovery Mode') {
    const nextGap = mode.recoveryGap + amount;
    return {
      ok: true,
      mode: mode.name,
      affordable: false,
      remainingGuiltFree: 0,
      recoveryGap: nextGap,
      message: `This ${category} would increase your recovery gap from ${mode.recoveryGap.toFixed(0)} to ${nextGap.toFixed(0)}. It is better to delay it unless it is essential.`,
    };
  }

  const remaining = mode.guiltFreeSpending - amount;
  if (remaining >= 0 && mode.name === 'Freedom Mode') {
    return {
      ok: true,
      mode: mode.name,
      affordable: true,
      remainingGuiltFree: remaining,
      recoveryGap: 0,
      message: `Yes, this fits within your guilt-free spending. After this purchase, you will have ${remaining.toFixed(0)} left until payday.`,
    };
  }

  if (remaining >= 0) {
    return {
      ok: true,
      mode: mode.name,
      affordable: true,
      remainingGuiltFree: remaining,
      recoveryGap: 0,
      message: `This is possible, but it will leave only ${remaining.toFixed(0)} safe-to-spend until payday. Consider delaying it unless it is important.`,
    };
  }

  return {
    ok: true,
    mode: mode.name,
    affordable: false,
    remainingGuiltFree: 0,
    recoveryGap: Math.abs(remaining),
    message: `This purchase would touch protected money by ${Math.abs(remaining).toFixed(0)}. Consider waiting or choosing a lower amount.`,
  };
}

function sumCategories(byCategory, categories) {
  return [...categories].reduce((sum, category) => sum + (byCategory.get(category) || 0), 0);
}

function buildCategoryWarning({ monthlyExpenses, topCategoryEntry, topCategoryShare, reviewCategoryAmount, protectedMoneyMissing }) {
  if (protectedMoneyMissing) {
    return 'Add rent, bills, or recurring essentials to calculate your real guilt-free spending.';
  }
  if (monthlyExpenses <= 0) {
    return 'No expense pattern detected yet. Import transactions to see spending insights.';
  }
  if (reviewCategoryAmount > 0) {
    return 'Some transactions need review before BudgetBrain can give accurate spending insights.';
  }
  if (topCategoryShare >= 0.35 && topCategoryEntry[1] > 0 && topCategoryEntry[0] !== 'None') {
    return `Your highest spending category this month is ${topCategoryEntry[0]} at ${topCategoryEntry[1].toFixed(0)}.`;
  }
  return '';
}

function detectMoneyLeaks(expenseItems, previousTransactions) {
  const leaks = [];
  const smallFood = expenseItems.filter((item) => ['Dining', 'Groceries'].includes(item.category) && number(item.amount) <= 25);
  const smallFoodTotal = smallFood.reduce((sum, item) => sum + number(item.amount), 0);
  if (smallFood.length >= 5) {
    leaks.push({
      title: 'Frequent small purchases',
      message: `You spent ${smallFoodTotal.toFixed(0)} across ${smallFood.length} small food purchases this month.`,
    });
  }

  const subscriptionTotal = expenseItems.filter((item) => item.category === 'Subscriptions').reduce((sum, item) => sum + number(item.amount), 0);
  if (subscriptionTotal > 0) {
    leaks.push({ title: 'Subscription check', message: `You have ${subscriptionTotal.toFixed(0)} in subscriptions this month.` });
  }

  const previousByCategory = new Map();
  for (const item of previousTransactions.filter((tx) => tx.type === 'EXPENSE')) {
    previousByCategory.set(item.category, (previousByCategory.get(item.category) || 0) + number(item.amount));
  }
  const currentByCategory = new Map();
  for (const item of expenseItems) currentByCategory.set(item.category, (currentByCategory.get(item.category) || 0) + number(item.amount));
  for (const [category, amount] of currentByCategory.entries()) {
    const previous = previousByCategory.get(category) || 0;
    if (previous > 0 && amount > previous * 1.3) {
      leaks.push({ title: 'Spending spike', message: `${category} increased by ${Math.round(((amount - previous) / previous) * 100)}% compared to last month.` });
      break;
    }
  }

  const repeatedMerchants = Object.entries(expenseItems.reduce((acc, item) => {
    acc[item.merchant] = (acc[item.merchant] || 0) + 1;
    return acc;
  }, {})).filter(([, count]) => count >= 4);
  if (repeatedMerchants.length) {
    leaks.push({ title: 'Repeated merchant', message: `${repeatedMerchants[0][0]} appeared ${repeatedMerchants[0][1]} times this month.` });
  }

  return leaks;
}

function buildDebtPressure({ debts, monthlyIncome, debtRepayments }) {
  const highestInterest = [...debts].sort((a, b) => number(b.annualRate) - number(a.annualRate))[0] || null;
  const debtRatio = monthlyIncome > 0 ? Number(((debtRepayments / monthlyIncome) * 100).toFixed(1)) : 0;
  return {
    totalDebt: debts.reduce((sum, debt) => sum + number(debt.balance), 0),
    repaymentRatio: debtRatio,
    highestInterestDebt: highestInterest ? {
      name: highestInterest.name,
      rate: number(highestInterest.annualRate),
      balance: number(highestInterest.balance),
    } : null,
    warning: debtRatio >= 20 ? `Debt repayments take ${debtRatio}% of monthly income.` : '',
    focusFirst: highestInterest ? `Your highest-interest debt is ${highestInterest.name}. Consider comparing avalanche and snowball payoff strategies.` : '',
  };
}

function buildMoneyMode({ currentBalance, essentialsSpending, debtRepayments, debtCategorySpending = 0, committedBeforePayday, emergencyDays, monthlyIncome, monthlyExpenses, spendingChangePercent, moneyLeaks, debtPressure, hasExpenseData, nextPayday = 'Not set' }) {
  const protectedMoney = Math.max(0, committedBeforePayday + debtRepayments + estimateBasicFoodAndTransport(essentialsSpending, committedBeforePayday + debtCategorySpending));
  const protectedMoneyMissing = protectedMoney <= 0 && (hasExpenseData || monthlyIncome > 0);
  const guiltFreeSpending = Math.max(0, currentBalance - protectedMoney);
  const recoveryGap = currentBalance < 0 || currentBalance - protectedMoney < 0
    ? Math.abs(Math.min(0, currentBalance)) + Math.max(0, protectedMoney - Math.max(0, currentBalance))
    : 0;
  const pressureReasons = [];
  const lowSafeSpend = monthlyIncome > 0 && guiltFreeSpending <= monthlyIncome * 0.08;

  if (monthlyIncome > 0 && monthlyExpenses / monthlyIncome >= 0.85) pressureReasons.push('Expenses are close to income.');
  if (lowSafeSpend) pressureReasons.push('Safe-to-spend money is low.');
  if (debtPressure.repaymentRatio >= 20) pressureReasons.push('Debt repayments are taking a large share of income.');
  if (spendingChangePercent >= 20) pressureReasons.push(`Spending is up ${spendingChangePercent}% from last month.`);
  const pressureLeak = moneyLeaks.find((item) => item.title !== 'Subscription check');
  if (pressureLeak) pressureReasons.push(pressureLeak.message);

  if (!hasExpenseData && monthlyIncome <= 0) {
    return {
      name: 'Setup Needed',
      status: 'setup',
      message: 'Build your Money Map. Upload a payslip, import transactions, or quick add one sentence to calculate your real guilt-free spending.',
      currentBalance,
      protectedMoney,
      protectedMoneyMissing: true,
      nextPayday,
      guiltFreeSpending: 0,
      recoveryGap: 0,
      suggestedSpendingLimit: 0,
      upcomingBills: 0,
      essentialCostsBeforePayday: 0,
      expectedIncome: 0,
      survivalPriorities: [],
      pauseOrReduce: [],
      reasons: ['Add income and protected essentials to get a real mode.'],
    };
  }

  if (protectedMoneyMissing && currentBalance >= 0) {
    return {
      name: 'Setup Needed',
      status: 'setup',
      message: 'Protected money is not set yet. Add rent, bills, or upload transactions so BudgetBrain can protect your essentials.',
      currentBalance,
      protectedMoney,
      protectedMoneyMissing: true,
      nextPayday,
      guiltFreeSpending,
      recoveryGap: 0,
      suggestedSpendingLimit: 0,
      upcomingBills: 0,
      essentialCostsBeforePayday: 0,
      expectedIncome: monthlyIncome,
      survivalPriorities: [],
      pauseOrReduce: [],
      reasons: ['Add rent, bills, or recurring essentials to calculate your real guilt-free spending.'],
    };
  }

  if (currentBalance < 0 || recoveryGap > 0 || (monthlyIncome > 0 && monthlyExpenses > monthlyIncome)) {
    return {
      name: 'Recovery Mode',
      status: 'recovery',
      message: 'You are in Recovery Mode. The goal is not saving right now. The goal is to stop the financial bleeding and get back to zero safely.',
      currentBalance,
      protectedMoney,
      protectedMoneyMissing,
      nextPayday,
      guiltFreeSpending: 0,
      recoveryGap,
      suggestedSpendingLimit: 0,
      upcomingBills: committedBeforePayday,
      essentialCostsBeforePayday: protectedMoney,
      expectedIncome: monthlyIncome,
      survivalPriorities: ['Housing / rent', 'Food basics', 'Transport to work or study', 'Phone / internet if needed', 'Minimum debt repayments', 'Everything else later'],
      pauseOrReduce: ['Dining', 'Shopping', 'Extra subscriptions', 'Non-urgent savings'],
      reasons: pressureReasons.length ? pressureReasons : ['Protected costs are higher than available balance.'],
    };
  }

  if (pressureReasons.length || lowSafeSpend) {
    return {
      name: 'Watch Mode',
      status: 'watch',
      message: 'You can still spend, but pressure is building. Be careful with flexible spending until payday.',
      currentBalance,
      protectedMoney,
      protectedMoneyMissing,
      nextPayday,
      guiltFreeSpending,
      recoveryGap: 0,
      suggestedSpendingLimit: guiltFreeSpending,
      upcomingBills: committedBeforePayday,
      essentialCostsBeforePayday: protectedMoney,
      expectedIncome: monthlyIncome,
      survivalPriorities: [],
      pauseOrReduce: ['Dining', 'Shopping', 'Extra subscriptions'],
      reasons: pressureReasons,
    };
  }

  return {
    name: 'Freedom Mode',
    status: 'freedom',
    message: 'You have money available to enjoy after protecting your important expenses.',
    currentBalance,
    protectedMoney,
    protectedMoneyMissing,
    nextPayday,
    guiltFreeSpending,
    recoveryGap: 0,
    suggestedSpendingLimit: guiltFreeSpending,
    upcomingBills: committedBeforePayday,
    essentialCostsBeforePayday: protectedMoney,
    expectedIncome: monthlyIncome,
    survivalPriorities: [],
    pauseOrReduce: [],
    reasons: ['Important expenses are protected and guilt-free spending is available.'],
  };
}

function estimateBasicFoodAndTransport(essentialsSpending, committedBeforePayday) {
  return Math.max(0, essentialsSpending - committedBeforePayday);
}

function latestBalanceSnapshot(transactions) {
  const snapshot = transactions
    .filter((item) => item.source === 'demo_balance')
    .sort((a, b) => new Date(b.createdAt || b.occurredAt) - new Date(a.createdAt || a.occurredAt))[0];
  if (!snapshot) return null;
  const description = String(snapshot.description || '');
  const paydayMatch = description.match(/Next payday:\s*([^.]*)/i);
  return {
    balance: number(snapshot.amount),
    lastSyncedAt: snapshot.createdAt || snapshot.occurredAt,
    nextPayday: paydayMatch?.[1]?.trim() || 'Not set',
  };
}

function buildDemoBankStatus(transactions, balanceSnapshot) {
  const demoTransactions = transactions.filter((item) => item.source === 'demo_bank');
  if (!demoTransactions.length && !balanceSnapshot) {
    return {
      connected: false,
      label: 'No bank data connected',
      message: 'Connect Demo Bank, upload CSV, or add balance manually.',
      disclaimer: '',
      lastSyncedAt: null,
    };
  }
  return {
    connected: true,
    label: 'Demo Bank Connected',
    message: 'Transactions and balance synced.',
    disclaimer: 'This uses sample bank data. No real bank account is connected.',
    lastSyncedAt: balanceSnapshot?.lastSyncedAt || demoTransactions[0]?.createdAt || demoTransactions[0]?.occurredAt,
  };
}

function buildConfidenceLevel({ transactions, moneyMode, balanceSnapshot }) {
  if (moneyMode.status === 'setup') {
    return { level: 'Not Ready', reason: 'Payday, balance, income, or protected costs are missing.' };
  }
  const latestSource = transactions
    .filter((item) => ['demo_bank', 'demo_balance', 'csv'].includes(item.source))
    .sort((a, b) => new Date(b.createdAt || b.occurredAt) - new Date(a.createdAt || a.occurredAt))[0];
  const lastUpdated = balanceSnapshot?.lastSyncedAt || latestSource?.createdAt || latestSource?.occurredAt || null;
  if (!lastUpdated) {
    return { level: 'Low', reason: 'No recent bank, CSV, or balance update is available.', lastUpdatedAt: null };
  }
  const ageHours = (Date.now() - new Date(lastUpdated).getTime()) / 36e5;
  if (ageHours <= 24) {
    return { level: 'High', reason: 'Demo bank, CSV, or balance data was updated recently.', lastUpdatedAt: lastUpdated };
  }
  return { level: ageHours <= 72 ? 'Medium' : 'Low', reason: 'Some data exists, but it may need an update.', lastUpdatedAt: lastUpdated };
}

function buildMoneyPressure({ moneyMode, confidence, monthlyIncome, monthlyExpenses, moneyLeaks, debtPressure }) {
  if (moneyMode.status === 'setup' || confidence.level === 'Not Ready') {
    return {
      level: 'Critical',
      reason: 'Payday, balance, income, or protected essentials are missing.',
      action: 'Add payday, income, balance, and protected essentials to calculate safely.',
    };
  }
  if (moneyMode.status === 'recovery') {
    return {
      level: 'High',
      reason: 'Safe-to-spend is negative or the current balance is below zero.',
      action: 'Protect food and transport first. Pause non-essential spending until payday.',
    };
  }
  const dailySafe = moneyMode.guiltFreeSpending / 3;
  if (moneyMode.status === 'watch' || dailySafe < 25) {
    return {
      level: 'Medium',
      reason: `Safe-to-spend is ${moneyMode.guiltFreeSpending.toFixed(0)}, which leaves about ${Math.max(0, dailySafe).toFixed(0)} per day until payday.`,
      action: `Keep flexible spending under ${Math.max(0, dailySafe).toFixed(0)} per day until payday.`,
    };
  }
  if ((monthlyIncome > 0 && monthlyExpenses / monthlyIncome >= 0.75) || debtPressure.repaymentRatio >= 20 || moneyLeaks.some((item) => item.title !== 'Subscription check')) {
    return {
      level: 'Medium',
      reason: 'Some spending pressure is showing, but safe-to-spend is still positive.',
      action: 'Keep essentials protected and check Mini Guard before non-essential purchases.',
    };
  }
  return {
    level: 'Low',
    reason: 'Protected essentials are covered and safe-to-spend is comfortable.',
    action: `You can spend up to ${moneyMode.guiltFreeSpending.toFixed(0)} before payday.`,
  };
}

function buildFinancialHealth({ monthlyIncome, monthlyExpenses, debtRepayments, emergencyDays, committedBeforePayday, categoryWarning }) {
  const reasons = [];
  let score = 0;
  const expenseRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;
  const debtRatio = monthlyIncome > 0 ? (debtRepayments / monthlyIncome) * 100 : 0;
  const committedRatio = monthlyIncome > 0 ? (committedBeforePayday / monthlyIncome) * 100 : 0;

  if (monthlyIncome <= 0) {
    score += 2;
    reasons.push('No income is recorded for this month.');
  }
  if (expenseRatio >= 95) {
    score += 3;
    reasons.push(`Your expenses are ${Math.round(expenseRatio)}% of income.`);
  } else if (expenseRatio >= 80) {
    score += 2;
    reasons.push(`Your expenses are ${Math.round(expenseRatio)}% of income.`);
  }
  if (debtRatio >= 25) {
    score += 2;
    reasons.push(`Debt repayments take ${Math.round(debtRatio)}% of income.`);
  }
  if (emergencyDays < 30) {
    score += 1;
    reasons.push('You have less than one month of emergency savings.');
  }
  if (committedRatio >= 35) {
    score += 1;
    reasons.push(`${committedBeforePayday.toFixed(0)} is already committed before payday.`);
  }
  if (monthlyIncome > 0 && monthlyExpenses > monthlyIncome) {
    score += 3;
    reasons.push('Your net cashflow is negative this month.');
  }
  if (categoryWarning) score += 1;

  const status = score >= 6 ? 'Critical' : score >= 4 ? 'High Pressure' : score >= 2 ? 'Watch Carefully' : 'Healthy';
  return { status, reasons };
}
