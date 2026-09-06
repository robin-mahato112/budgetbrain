export class FinancialSourceProvider {
  constructor(id) { this.id = id; }
  async getAccounts() { throw new Error(`${this.id} does not implement getAccounts`); }
  async getTransactions() { throw new Error(`${this.id} does not implement getTransactions`); }
}
