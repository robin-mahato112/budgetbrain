export const validators = {
  required: (value) => String(value ?? '').trim().length > 0,
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
  positiveNumber: (value) => Number.isFinite(Number(value)) && Number(value) > 0,
  nonNegativeNumber: (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
};
