import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { auditService } from './auditService';

export interface Account {
  id: string;
  family_id: string;
  name: string;
  type: 'cash' | 'bank' | 'savings' | 'credit_card' | 'debit_card' | 'e_wallet' | 'investment' | 'other';
  institution: string;
  account_number_mask?: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  credit_limit?: number;
  status: 'active' | 'archived';
  color: string;
  icon: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const accountService = {
  getAccounts(familyId: string): Account[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM accounts 
      WHERE family_id = ? AND status = 'active'
      ORDER BY name ASC
    `).all(familyId);
    return rows as unknown as Account[];
  },

  getAccountById(id: string): Account | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    return (row as unknown as Account) || null;
  },

  createAccount(familyId: string, data: Omit<Account, 'id' | 'family_id' | 'current_balance' | 'created_at' | 'updated_at'>): Account {
    const db = getDb();
    const id = crypto.randomUUID();
    const currentBalance = data.initial_balance || 0;

    db.prepare(`
      INSERT INTO accounts (
        id, family_id, name, type, institution, account_number_mask,
        currency, initial_balance, current_balance, credit_limit, status,
        color, icon, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      familyId,
      data.name,
      data.type,
      data.institution || 'Personal',
      data.account_number_mask || '',
      data.currency || 'USD',
      data.initial_balance || 0,
      currentBalance,
      data.credit_limit || 0,
      data.status || 'active',
      data.color || '#3B82F6',
      data.icon || 'wallet',
      data.description || ''
    );

    auditService.log(familyId, 'CREATE', 'ACCOUNT', id, { name: data.name, type: data.type, initial_balance: data.initial_balance });
    return this.getAccountById(id)!;
  },

  updateAccount(id: string, data: Partial<Account>): Account | null {
    const db = getDb();
    const existing = this.getAccountById(id);
    if (!existing) return null;

    db.prepare(`
      UPDATE accounts
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          institution = COALESCE(?, institution),
          account_number_mask = COALESCE(?, account_number_mask),
          currency = COALESCE(?, currency),
          credit_limit = COALESCE(?, credit_limit),
          color = COALESCE(?, color),
          icon = COALESCE(?, icon),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.name ?? null,
      data.type ?? null,
      data.institution ?? null,
      data.account_number_mask ?? null,
      data.currency ?? null,
      data.credit_limit ?? null,
      data.color ?? null,
      data.icon ?? null,
      data.description ?? null,
      data.status ?? null,
      id
    );

    auditService.log(existing.family_id, 'UPDATE', 'ACCOUNT', id, data);
    return this.getAccountById(id);
  },

  deleteAccount(id: string): { success: boolean; message?: string } {
    const db = getDb();
    const existing = this.getAccountById(id);
    if (!existing) return { success: false, message: 'Account not found' };

    // Check if account has transactions
    const txCount = (db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE account_id = ? OR to_account_id = ?').get(id, id) as { cnt: number }).cnt;
    if (txCount > 0) {
      // Archive instead of hard delete to preserve historical integrity
      db.prepare("UPDATE accounts SET status = 'archived', updated_at = datetime('now') WHERE id = ?").run(id);
      auditService.log(existing.family_id, 'UPDATE', 'ACCOUNT', id, { action: 'archived_due_to_history', transactionCount: txCount });
      return { success: true, message: `Account archived because it has ${txCount} historical transactions.` };
    }

    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    auditService.log(existing.family_id, 'DELETE', 'ACCOUNT', id, { name: existing.name });
    return { success: true };
  },

  recalculateBalance(accountId: string): number {
    const db = getDb();
    const acc = this.getAccountById(accountId);
    if (!acc) return 0;

    // Sum income
    const incomeRow = db.prepare(`
      SELECT COALESCE(SUM(converted_amount), 0) as total 
      FROM transactions 
      WHERE account_id = ? AND type = 'income'
    `).get(accountId) as { total: number };

    // Sum expenses
    const expenseRow = db.prepare(`
      SELECT COALESCE(SUM(converted_amount), 0) as total 
      FROM transactions 
      WHERE account_id = ? AND type = 'expense'
    `).get(accountId) as { total: number };

    // Sum incoming transfers
    const inTransfers = db.prepare(`
      SELECT COALESCE(SUM(converted_amount), 0) as total 
      FROM transactions 
      WHERE to_account_id = ? AND type = 'transfer'
    `).get(accountId) as { total: number };

    // Sum outgoing transfers
    const outTransfers = db.prepare(`
      SELECT COALESCE(SUM(converted_amount), 0) as total 
      FROM transactions 
      WHERE account_id = ? AND type = 'transfer'
    `).get(accountId) as { total: number };

    const newBalance = acc.initial_balance + incomeRow.total - expenseRow.total + inTransfers.total - outTransfers.total;

    db.prepare(`
      UPDATE accounts 
      SET current_balance = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(newBalance, accountId);

    return newBalance;
  },

  transfer(
    familyId: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    description: string = 'Account Transfer',
    familyMemberId?: string
  ) {
    const db = getDb();
    if (fromAccountId === toAccountId) {
      throw new Error('Source and destination accounts must be different');
    }
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than zero');
    }

    const fromAcc = this.getAccountById(fromAccountId);
    const toAcc = this.getAccountById(toAccountId);
    if (!fromAcc || !toAcc) {
      throw new Error('One or both accounts were not found');
    }

    const txId = crypto.randomUUID();

    // Begin atomic transfer
    db.exec('BEGIN TRANSACTION;');
    try {
      // Create transfer transaction (not counted as family income/expense)
      db.prepare(`
        INSERT INTO transactions (
          id, family_id, type, amount, currency, exchange_rate, converted_amount,
          date, time, description, account_id, to_account_id, family_member_id,
          payment_method, notes
        ) VALUES (?, ?, 'transfer', ?, ?, 1.0, ?, ?, '12:00', ?, ?, ?, ?, 'Transfer', ?)
      `).run(
        txId,
        familyId,
        amount,
        fromAcc.currency,
        amount,
        date,
        description,
        fromAccountId,
        toAccountId,
        familyMemberId || null,
        `Transferred from ${fromAcc.name} to ${toAcc.name}`
      );

      // Debit source account
      db.prepare('UPDATE accounts SET current_balance = current_balance - ?, updated_at = datetime(\'now\') WHERE id = ?').run(amount, fromAccountId);
      // Credit destination account
      db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ?').run(amount, toAccountId);

      db.exec('COMMIT;');

      auditService.log(familyId, 'TRANSFER', 'TRANSACTION', txId, {
        fromAccount: fromAcc.name,
        toAccount: toAcc.name,
        amount
      });

      return { txId, success: true };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }
};
