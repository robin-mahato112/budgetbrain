import { FinancialSourceProvider } from './FinancialSourceProvider.js';
import { normalizeTransaction } from '../transactionNormalizationService.js';
import { getDemoBalances, getDemoTransactions } from '../bankProviders/mockBankProvider.js';

export class DemoBankProvider extends FinancialSourceProvider {
  constructor() { super('DEMO_BANK'); }
  getAccounts(connection) { return getDemoBalances(connection); }
  async getTransactions(connection) {
    const transactions = await getDemoTransactions(connection);
    return transactions.map((item, index) => normalizeTransaction({
      ...item,
      source: 'DEMO_BANK',
      externalId: `${connection.scenario}-${index}-${item.merchant}`,
      transactionDate: item.occurredAt,
      direction: item.type,
      currency: 'AUD',
      accountName: 'Demo Everyday Account',
    }));
  }
}
