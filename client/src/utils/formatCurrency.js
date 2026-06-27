export function formatCurrency(value, options = {}) {
  const numericValue = Number(value);
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: options.decimals ?? 0,
    minimumFractionDigits: options.decimals ?? 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}
