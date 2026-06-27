export function calculateDebtPayoff(principalValue, annualRateValue, paymentValue) {
  const principal = Number(principalValue);
  const payment = Number(paymentValue);
  const annualRate = Number(annualRateValue);

  if (![principal, payment, annualRate].every(Number.isFinite)) {
    return { error: 'Enter valid numeric values.' };
  }
  if (principal <= 0 || payment <= 0 || annualRate < 0) {
    return { error: 'Enter a balance and payment greater than zero.' };
  }
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate > 0 && payment <= principal * monthlyRate) {
    return { error: 'The payment must be greater than the monthly interest.' };
  }

  const months = monthlyRate === 0
    ? Math.ceil(principal / payment)
    : Math.ceil(-Math.log(1 - (monthlyRate * principal) / payment) / Math.log(1 + monthlyRate));
  if (!Number.isFinite(months) || months <= 0 || months > 1200) {
    return { error: 'This scenario exceeds the 100-year calculation limit. Increase the payment.' };
  }

  let totalPaid;
  if (monthlyRate === 0) {
    totalPaid = principal;
  } else {
    const completedPayments = Math.max(0, months - 1);
    const growth = (1 + monthlyRate) ** completedPayments;
    const balanceBeforeFinalMonth = principal * growth - payment * ((growth - 1) / monthlyRate);
    const finalPayment = Math.max(0, balanceBeforeFinalMonth * (1 + monthlyRate));
    totalPaid = payment * completedPayments + Math.min(payment, finalPayment);
  }

  return { months, totalPaid, totalInterest: Math.max(0, totalPaid - principal) };
}
