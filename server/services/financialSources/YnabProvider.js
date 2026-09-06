import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { FinancialSourceProvider } from './FinancialSourceProvider.js';
import { normalizeTransaction } from '../transactionNormalizationService.js';

const API_URL = 'https://api.ynab.com/v1';

export class YnabProvider extends FinancialSourceProvider {
  constructor() { super('YNAB'); }

  get configured() { return Boolean(env.YNAB_CLIENT_ID && env.YNAB_CLIENT_SECRET && env.YNAB_REDIRECT_URI); }

  authorizationUrl(state) {
    this.assertConfigured();
    const query = new URLSearchParams({
      client_id: env.YNAB_CLIENT_ID,
      redirect_uri: env.YNAB_REDIRECT_URI,
      response_type: 'code',
      state,
    });
    return `https://app.ynab.com/oauth/authorize?${query}`;
  }

  exchangeCode(code) {
    return this.requestToken({
      client_id: env.YNAB_CLIENT_ID, client_secret: env.YNAB_CLIENT_SECRET,
      redirect_uri: env.YNAB_REDIRECT_URI, grant_type: 'authorization_code', code,
    });
  }

  async getBudgets(token) {
    const data = await request('/plans', token);
    return data.plans || data.budgets || [];
  }

  async getAccounts({ token, budgetId }) {
    const data = await request(`/plans/${encodeURIComponent(budgetId)}/accounts`, token);
    return (data.accounts || []).map((account) => ({
      externalId: account.id, name: account.name, closed: Boolean(account.closed), currency: currencyFrom(account),
    }));
  }

  async getTransactions({ token, budgetId, serverKnowledge }) {
    const suffix = serverKnowledge ? `?last_knowledge_of_server=${encodeURIComponent(serverKnowledge)}` : '';
    const data = await request(`/plans/${encodeURIComponent(budgetId)}/transactions${suffix}`, token);
    return {
      serverKnowledge: data.server_knowledge,
      transactions: (data.transactions || []).map((item) => normalizeTransaction({
        source: 'YNAB', externalId: item.id, accountName: item.account_name,
        description: item.memo || item.payee_name || item.category_name || 'YNAB transaction',
        merchant: item.payee_name || item.category_name || 'YNAB',
        amount: Number(item.amount) / 1000,
        direction: Number(item.amount) >= 0 ? 'INCOME' : 'EXPENSE',
        transactionDate: item.date,
        category: item.category_name,
        currency: currencyFrom(item), deleted: item.deleted,
      })),
    };
  }

  async requestToken(body) {
    this.assertConfigured();
    const response = await fetch('https://app.ynab.com/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new AppError(502, 'YNAB_OAUTH_FAILED', 'YNAB authentication could not be completed');
    return response.json();
  }

  assertConfigured() {
    if (!this.configured) throw new AppError(503, 'YNAB_NOT_CONFIGURED', 'YNAB is not configured for this BudgetBrain installation');
  }
}

async function request(path, token) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  } catch {
    throw new AppError(503, 'YNAB_UNAVAILABLE', 'YNAB could not be reached. Existing transactions are still available.');
  }
  if (response.status === 401) throw new AppError(401, 'YNAB_TOKEN_EXPIRED', 'YNAB connection has expired. Reconnect to continue syncing.');
  if (response.status === 429) throw new AppError(429, 'YNAB_RATE_LIMITED', 'YNAB rate limit reached. Try again later.');
  if (!response.ok) throw new AppError(502, 'YNAB_REQUEST_FAILED', 'YNAB could not complete the request');
  return (await response.json()).data;
}

function currencyFrom(value) {
  return value?.currency_format?.iso_code || value?.currency || 'AUD';
}
