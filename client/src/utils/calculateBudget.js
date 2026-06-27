export function calculateBudget(income, expenses = []) {
  const incomeValue = Number(income);
  if (!Number.isFinite(incomeValue) || incomeValue < 0) {
    return { error: 'Income must be a valid number of zero or more.' };
  }

  const expenseValues = expenses.map((item) => Number(item.amount || 0));
  if (expenseValues.some((amount) => !Number.isFinite(amount) || amount < 0)) {
    return { error: 'Every expense must be a valid number of zero or more.' };
  }

  const totalIncome = incomeValue;
  const totalExpenses = expenseValues.reduce((sum, amount) => sum + amount, 0);
  const remaining = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    remaining,
    savingsRate: totalIncome > 0 ? (remaining / totalIncome) * 100 : 0,
  };
}
