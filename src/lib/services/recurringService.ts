import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { auditService } from './auditService';
import { transactionService } from './transactionService';

export interface RecurringTransaction {
  id: string;
  family_id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  account_id: string;
  family_member_id?: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string;
  next_occurrence: string;
  description: string;
  auto_create: number;
  status: 'active' | 'paused';
  created_at: string;
  // Computed
  category_name?: string;
  account_name?: string;
  member_name?: string;
}

export function computeNextDate(dateStr: string, frequency: RecurringTransaction['frequency']): string {
  const d = new Date(dateStr);
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split('T')[0];
}

export const recurringService = {
  getRecurring(familyId: string): RecurringTransaction[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        r.*,
        c.name as category_name,
        a.name as account_name,
        m.name as member_name
      FROM recurring_transactions r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      LEFT JOIN family_members m ON r.family_member_id = m.id
      WHERE r.family_id = ?
      ORDER BY r.next_occurrence ASC
    `).all(familyId) as RecurringTransaction[];
    return rows;
  },

  createRecurring(familyId: string, data: {
    type: 'income' | 'expense';
    amount: number;
    category_id: string;
    account_id: string;
    family_member_id?: string;
    frequency: RecurringTransaction['frequency'];
    start_date: string;
    end_date?: string;
    description: string;
    auto_create?: boolean;
  }): RecurringTransaction {
    const db = getDb();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO recurring_transactions (
        id, family_id, type, amount, category_id, account_id,
        family_member_id, frequency, start_date, end_date,
        next_occurrence, description, auto_create, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      id,
      familyId,
      data.type,
      data.amount,
      data.category_id,
      data.account_id,
      data.family_member_id || null,
      data.frequency,
      data.start_date,
      data.end_date || null,
      data.start_date,
      data.description,
      data.auto_create !== false ? 1 : 0
    );

    auditService.log(familyId, 'CREATE', 'TRANSACTION', id, { description: data.description, recurring: true });
    return this.getRecurring(familyId).find((r) => r.id === id)!;
  },

  processDueRecurring(familyId: string): number {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const dueList = db.prepare(`
      SELECT * FROM recurring_transactions
      WHERE family_id = ? AND status = 'active' AND auto_create = 1 AND next_occurrence <= ?
    `).all(familyId, today) as RecurringTransaction[];

    let createdCount = 0;

    for (const rec of dueList) {
      // Create transaction
      transactionService.createTransaction({
        family_id: rec.family_id,
        type: rec.type,
        amount: rec.amount,
        date: rec.next_occurrence,
        description: `[Auto] ${rec.description}`,
        category_id: rec.category_id,
        account_id: rec.account_id,
        family_member_id: rec.family_member_id,
        is_recurring: 1,
        recurring_id: rec.id
      });

      // Calculate next occurrence
      const nextDate = computeNextDate(rec.next_occurrence, rec.frequency);
      const isPastEnd = rec.end_date && nextDate > rec.end_date;

      db.prepare(`
        UPDATE recurring_transactions
        SET next_occurrence = ?,
            status = CASE WHEN ? = 1 THEN 'paused' ELSE status END
        WHERE id = ?
      `).run(nextDate, isPastEnd ? 1 : 0, rec.id);

      createdCount++;
    }

    return createdCount;
  },

  deleteRecurring(id: string): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get(id) as RecurringTransaction | undefined;
    if (!existing) return false;

    db.prepare('DELETE FROM recurring_transactions WHERE id = ?').run(id);
    auditService.log(existing.family_id, 'DELETE', 'TRANSACTION', id, { name: existing.description });
    return true;
  }
};
