import { useContext } from 'react';
import { FinanceContext } from '../context/FinanceContext';

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside FinanceProvider');
  return value;
}
