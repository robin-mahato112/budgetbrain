export const TRANSACTION_CATEGORIES = Object.freeze([
  'INCOME', 'HOUSING', 'GROCERIES', 'TRANSPORT', 'UTILITIES', 'INSURANCE', 'DEBT',
  'SUBSCRIPTIONS', 'HEALTH', 'EDUCATION', 'REMITTANCE', 'OTHER_ESSENTIAL',
  'DISCRETIONARY', 'UNKNOWN',
]);

export const CATEGORY_RULES = Object.freeze([
  ['INCOME', ['salary', 'payroll', 'wage', 'payslip', 'centrelink', 'deposit interest']],
  ['HOUSING', ['rent', 'mortgage', 'real estate', 'property manager', 'room']],
  ['GROCERIES', ['woolworths', 'coles', 'aldi', 'iga', 'grocery', 'supermarket']],
  ['TRANSPORT', ['uber', 'didi', 'opal', 'metro', 'petrol', 'fuel', 'shell', 'ampol', 'bp ']],
  ['UTILITIES', ['origin energy', 'agl', 'energy australia', 'electricity', 'water bill', 'telstra', 'optus', 'internet', 'phone bill']],
  ['INSURANCE', ['insurance', 'allianz', 'aami', 'nrma', 'medibank', 'bupa']],
  ['DEBT', ['loan repayment', 'credit card payment', 'minimum payment', 'afterpay', 'zip pay']],
  ['SUBSCRIPTIONS', ['netflix', 'spotify', 'disney', 'youtube premium', 'apple.com/bill']],
  ['HEALTH', ['pharmacy', 'chemist', 'doctor', 'medical', 'dentist', 'hospital']],
  ['EDUCATION', ['university', 'tafe', 'school', 'tuition', 'textbook']],
  ['REMITTANCE', ['remitly', 'wise transfer', 'western union', 'family support', 'remittance']],
  ['OTHER_ESSENTIAL', ['childcare', 'council rates', 'essential']],
  ['DISCRETIONARY', ['restaurant', 'cafe', 'takeaway', 'mcdonald', 'kfc', 'shopping', 'cinema', 'gaming']],
]);

export function merchantKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(?:pty|ltd|limited|australia|au)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(?:com|co)\b$/g, '')
    .trim()
    .slice(0, 120);
}

export function categorizeDeterministically(input, direction = 'EXPENSE', userRules = []) {
  if (String(direction).toUpperCase() === 'INCOME') return result('INCOME', 1, 'direction');
  const text = merchantKey(input);
  const remembered = userRules.find((rule) => text.includes(merchantKey(rule.merchantKey)));
  if (remembered && TRANSACTION_CATEGORIES.includes(remembered.category)) {
    return result(remembered.category, 1, 'user-rule');
  }
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((keyword) => text.includes(keyword))) return result(category, 0.95, 'merchant-rule');
  }
  return result('UNKNOWN', 0, 'unmatched');
}

function result(category, confidence, reason) {
  return {
    category,
    confidence,
    reason,
    needsReview: category === 'UNKNOWN' || confidence < 0.8,
  };
}

export function categoryLabel(category) {
  const labels = {
    INCOME: 'Income', HOUSING: 'Housing', GROCERIES: 'Groceries', TRANSPORT: 'Transport',
    UTILITIES: 'Bills', INSURANCE: 'Insurance', DEBT: 'Debt', SUBSCRIPTIONS: 'Subscriptions',
    HEALTH: 'Health', EDUCATION: 'Education', REMITTANCE: 'Remittance',
    OTHER_ESSENTIAL: 'Other essentials', DISCRETIONARY: 'Dining', UNKNOWN: 'Uncategorised',
  };
  return labels[category] || 'Uncategorised';
}
