import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { auditService } from './auditService';
import { accountService } from './accountService';

export interface Transaction {
  id: string;
  family_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  exchange_rate: number;
  converted_amount: number;
  date: string;
  time: string;
  description: string;
  category_id?: string;
  account_id: string;
  to_account_id?: string;
  family_member_id?: string;
  payment_method: string;
  merchant?: string;
  location?: string;
  notes?: string;
  receipt_url?: string;
  tags?: string;
  is_recurring: number;
  recurring_id?: string;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_name?: string;
  to_account_name?: string;
  member_name?: string;
  member_color?: string;
}

export interface TransactionFilters {
  familyId: string;
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense' | 'transfer' | 'all';
  categoryId?: string;
  accountId?: string;
  familyMemberId?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  tag?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'created_at';
  sortOrder?: 'ASC' | 'DESC';
}

export const transactionService = {
  getTransactions(filters: TransactionFilters): { transactions: Transaction[]; total: number; page: number; totalPages: number } {
    const db = getDb();
    const conditions: string[] = ['t.family_id = ?'];
    const params: unknown[] = [filters.familyId];

    if (filters.startDate) {
      conditions.push('t.date >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('t.date <= ?');
      params.push(filters.endDate);
    }
    if (filters.type && filters.type !== 'all') {
      conditions.push('t.type = ?');
      params.push(filters.type);
    }
    if (filters.categoryId) {
      conditions.push('t.category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.accountId) {
      conditions.push('(t.account_id = ? OR t.to_account_id = ?)');
      params.push(filters.accountId, filters.accountId);
    }
    if (filters.familyMemberId) {
      conditions.push('t.family_member_id = ?');
      params.push(filters.familyMemberId);
    }
    if (filters.search) {
      conditions.push('(t.description LIKE ? OR t.merchant LIKE ? OR t.notes LIKE ? OR t.tags LIKE ?)');
      const q = `%${filters.search}%`;
      params.push(q, q, q, q);
    }
    if (filters.minAmount !== undefined) {
      conditions.push('t.amount >= ?');
      params.push(filters.minAmount);
    }
    if (filters.maxAmount !== undefined) {
      conditions.push('t.amount <= ?');
      params.push(filters.maxAmount);
    }
    if (filters.tag) {
      conditions.push('t.tags LIKE ?');
      params.push(`%${filters.tag}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countSql = `SELECT COUNT(*) as count FROM transactions t ${whereClause}`;
    const countRow = db.prepare(countSql).get(...params) as { count: number };
    const total = countRow ? countRow.count : 0;

    // Sorting & pagination
    const sortBy = filters.sortBy || 'date';
    const sortOrder = filters.sortOrder || 'DESC';
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 25;
    const offset = (page - 1) * limit;

    const selectSql = `
      SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        a1.name as account_name,
        a2.name as to_account_name,
        m.name as member_name,
        m.avatar_color as member_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a1 ON t.account_id = a1.id
      LEFT JOIN accounts a2 ON t.to_account_id = a2.id
      LEFT JOIN family_members m ON t.family_member_id = m.id
      ${whereClause}
      ORDER BY t.${sortBy} ${sortOrder}, t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const txRows = db.prepare(selectSql).all(...params, limit, offset) as unknown as Transaction[];

    return {
      transactions: txRows,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1
    };
  },

  getTransactionById(id: string): Transaction | null {
    const db = getDb();
    const sql = `
      SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        a1.name as account_name,
        a2.name as to_account_name,
        m.name as member_name,
        m.avatar_color as member_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a1 ON t.account_id = a1.id
      LEFT JOIN accounts a2 ON t.to_account_id = a2.id
      LEFT JOIN family_members m ON t.family_member_id = m.id
      WHERE t.id = ?
    `;
    const row = db.prepare(sql).get(id);
    return (row as unknown as Transaction) || null;
  },

  createTransaction(data: {
    family_id: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    currency?: string;
    exchange_rate?: number;
    date: string;
    time?: string;
    description: string;
    category_id?: string;
    account_id: string;
    to_account_id?: string;
    family_member_id?: string;
    payment_method?: string;
    merchant?: string;
    location?: string;
    notes?: string;
    receipt_url?: string;
    tags?: string;
    is_recurring?: number;
    recurring_id?: string;
  }): Transaction {
    const db = getDb();
    if (data.amount <= 0) {
      throw new Error('Transaction amount must be strictly positive');
    }
    if (!data.account_id) {
      throw new Error('Account must be specified');
    }
    if (data.type === 'transfer' && !data.to_account_id) {
      throw new Error('Destination account required for transfer');
    }

    const id = crypto.randomUUID();
    const currency = data.currency || 'USD';
    const rate = data.exchange_rate || 1.0;
    const convertedAmount = Number((data.amount * rate).toFixed(2));
    const time = data.time || '12:00';

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO transactions (
          id, family_id, type, amount, currency, exchange_rate, converted_amount,
          date, time, description, category_id, account_id, to_account_id,
          family_member_id, payment_method, merchant, location, notes,
          receipt_url, tags, is_recurring, recurring_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.family_id,
        data.type,
        data.amount,
        currency,
        rate,
        convertedAmount,
        data.date,
        time,
        data.description,
        data.category_id || null,
        data.account_id,
        data.to_account_id || null,
        data.family_member_id || null,
        data.payment_method || 'Card',
        data.merchant || null,
        data.location || null,
        data.notes || null,
        data.receipt_url || null,
        data.tags || null,
        data.is_recurring ? 1 : 0,
        data.recurring_id || null
      );

      // Ledger balance update
      if (data.type === 'income') {
        db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(convertedAmount, data.account_id);
      } else if (data.type === 'expense') {
        db.prepare('UPDATE accounts SET current_balance = current_balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(convertedAmount, data.account_id);
      } else if (data.type === 'transfer' && data.to_account_id) {
        db.prepare('UPDATE accounts SET current_balance = current_balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(convertedAmount, data.account_id);
        db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(convertedAmount, data.to_account_id);
      }

      db.exec('COMMIT;');

      auditService.log(data.family_id, 'CREATE', 'TRANSACTION', id, {
        type: data.type,
        amount: data.amount,
        description: data.description,
        account_id: data.account_id
      });

      return this.getTransactionById(id)!;
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    const db = getDb();
    const existing = this.getTransactionById(id);
    if (!existing) return null;

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Revert existing balance impact
      if (existing.type === 'income') {
        db.prepare('UPDATE accounts SET current_balance = current_balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(existing.converted_amount, existing.account_id);
      } else if (existing.type === 'expense') {
        db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(existing.converted_amount, existing.account_id);
      } else if (existing.type === 'transfer' && existing.to_account_id) {
        db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(existing.converted_amount, existing.account_id);
        db.prepare('UPDATE accounts SET current_balance = current_balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(existing.converted_amount, existing.to_account_id);
      }

      // Merge new values
      const newType = updates.type || existing.type;
      const newAmount = updates.amount !== undefined ? updates.amount : existing.amount;
      const newRate = updates.exchange_rate !== undefined ? updates.exchange_rate : existing.exchange_rate;
      const newConverted = Number((newAmount * newRate).toFixed(2));
      const newAccountId = updates.account_id || existing.account_id;
      const newToAccountId = updates.to_account_id !== undefined ? updates.to_account_id : existing.to_account_id;

      // Update record
      db.prepare(`
        UPDATE transactions
        SET type = ?,
            amount = ?,
            currency = ?,
            exchange_rate = ?,
            converted_amount = ?,
            date = ?,
            time = ?,
            description = ?,
            category_id = ?,
            account_id = ?,
            to_account_id = ?,
            family_member_id = ?,
            payment_method = ?,
            merchant = ?,
            location = ?,
            notes = ?,
            receipt_url = ?,
            tags = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        newType,
        newAmount,
        updates.currency || existing.currency,
        newRate,
        newConverted,
        updates.date || existing.date,
        updates.time || existing.time,
        updates.description || existing.description,
        updates.category_id !== undefined ? updates.category_id : existing.category_id,
        newAccountId,
        newToAccountId || null,
        updates.family_member_id !== undefined ? updates.family_member_id : existing.family_member_id,
        updates.payment_method || existing.payment_method,
        updates.merchant !== undefined ? updates.merchant : existing.merchant,
        updates.location !== undefined ? updates.location : existing.location,
        updates.notes !== undefined ? updates.notes : existing.notes,
        updates.receipt_url !== undefined ? updates.receipt_url : existing.receipt_url,
        updates.tags !== undefined ? updates.tags : existing.tags,
        id
      );

      // 2. Apply new balance impact
      if (newType === 'income') {
        db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(newConverted, newAccountId);
      } else if (newType === 'expense') {
        db.prepare('UPDATE accounts SET current_balance = current_balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(newConverted, newAccountId);
      } else if (newType === 'transfer' && newToAccountId) {
        db.prepare('UPDATE accounts SET current_balance = current_balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(newConverted, newAccountId);
        db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(newConverted, newToAccountId);
      }

      db.exec('COMMIT;');

      auditService.log(existing.family_id, 'UPDATE', 'TRANSACTION', id, updates);
      return this.getTransactionById(id);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  deleteTransaction(id: string): boolean {
    const db = getDb();
    const existing = this.getTransactionById(id);
    if (!existing) return false;

    db.exec('BEGIN TRANSACTION;');
    try {
      // Revert account balances
      if (existing.type === 'income') {
        db.prepare('UPDATE accounts SET current_balance = current_balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(existing.converted_amount, existing.account_id);
      } else if (existing.type === 'expense') {
        db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(existing.converted_amount, existing.account_id);
      } else if (existing.type === 'transfer' && existing.to_account_id) {
        db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(existing.converted_amount, existing.account_id);
        db.prepare('UPDATE accounts SET current_balance = current_balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(existing.converted_amount, existing.to_account_id);
      }

      db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
      db.exec('COMMIT;');

      auditService.log(existing.family_id, 'DELETE', 'TRANSACTION', id, {
        description: existing.description,
        amount: existing.amount,
        type: existing.type
      });

      return true;
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }
};
