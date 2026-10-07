import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { auditService } from './auditService';

export interface Budget {
  id: string;
  family_id: string;
  category_id?: string;
  family_member_id?: string;
  account_id?: string;
  period_type: 'monthly' | 'weekly' | 'yearly';
  amount: number;
  currency: string;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
  // Computed
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  member_name?: string;
  spent: number;
  remaining: number;
  percentage_used: number;
  status: 'healthy' | 'near_limit' | 'exceeded';
  forecasted_spending: number;
}

export const budgetService = {
  getBudgets(familyId: string, monthStr?: string): Budget[] {
    const db = getDb();
    const now = new Date();
    // Default to current year-month: YYYY-MM
    const currentMonth = monthStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = `${currentMonth}-01`;
    // End of month calculation
    const [y, m] = currentMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endOfMonth = `${currentMonth}-${String(lastDay).padStart(2, '0')}`;

    // Days elapsed & total days for forecast
    const currentDay = Math.min(now.getDate(), lastDay);
    const daysElapsed = Math.max(1, currentDay);

    const budgetsRaw = db.prepare(`
      SELECT 
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        m.name as member_name
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN family_members m ON b.family_member_id = m.id
      WHERE b.family_id = ?
      ORDER BY b.amount DESC
    `).all(familyId) as (Budget & { category_name?: string; category_color?: string; category_icon?: string; member_name?: string })[];

    return budgetsRaw.map((b) => {
      // Calculate actual spent for this budget in the given period
      let spentQuery = `
        SELECT COALESCE(SUM(converted_amount), 0) as total_spent
        FROM transactions
        WHERE family_id = ? AND type = 'expense' AND date >= ? AND date <= ?
      `;
      const params: unknown[] = [familyId, startOfMonth, endOfMonth];

      if (b.category_id) {
        spentQuery += ' AND category_id = ?';
        params.push(b.category_id);
      }
      if (b.family_member_id) {
        spentQuery += ' AND family_member_id = ?';
        params.push(b.family_member_id);
      }
      if (b.account_id) {
        spentQuery += ' AND account_id = ?';
        params.push(b.account_id);
      }

      const spentRow = db.prepare(spentQuery).get(...params) as { total_spent: number };
      const spent = spentRow ? Number(spentRow.total_spent.toFixed(2)) : 0;
      const remaining = Number((b.amount - spent).toFixed(2));
      const percentageUsed = b.amount > 0 ? Number(((spent / b.amount) * 100).toFixed(1)) : 0;

      let status: 'healthy' | 'near_limit' | 'exceeded' = 'healthy';
      if (spent >= b.amount) {
        status = 'exceeded';
      } else if (spent >= b.amount * (b.alert_threshold || 0.85)) {
        status = 'near_limit';
      }

      // Forecasted spending
      const dailyRunRate = spent / daysElapsed;
      const forecastedSpending = Number((dailyRunRate * lastDay).toFixed(2));

      return {
        ...b,
        spent,
        remaining,
        percentage_used: percentageUsed,
        status,
        forecasted_spending: forecastedSpending
      };
    });
  },

  createBudget(familyId: string, data: {
    category_id?: string;
    family_member_id?: string;
    account_id?: string;
    period_type?: 'monthly' | 'weekly' | 'yearly';
    amount: number;
    currency?: string;
    alert_threshold?: number;
  }): Budget {
    const db = getDb();
    if (data.amount <= 0) {
      throw new Error('Budget amount must be greater than zero');
    }

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO budgets (
        id, family_id, category_id, family_member_id, account_id,
        period_type, amount, currency, alert_threshold
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      familyId,
      data.category_id || null,
      data.family_member_id || null,
      data.account_id || null,
      data.period_type || 'monthly',
      data.amount,
      data.currency || 'USD',
      data.alert_threshold || 0.85
    );

    auditService.log(familyId, 'CREATE', 'BUDGET', id, { amount: data.amount, category_id: data.category_id });
    const list = this.getBudgets(familyId);
    return list.find((b) => b.id === id)!;
  },

  updateBudget(id: string, updates: Partial<Budget>): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget | undefined;
    if (!existing) return false;

    db.prepare(`
      UPDATE budgets
      SET amount = COALESCE(?, amount),
          alert_threshold = COALESCE(?, alert_threshold),
          period_type = COALESCE(?, period_type),
          category_id = COALESCE(?, category_id),
          family_member_id = COALESCE(?, family_member_id),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updates.amount ?? null,
      updates.alert_threshold ?? null,
      updates.period_type ?? null,
      updates.category_id ?? null,
      updates.family_member_id ?? null,
      id
    );

    auditService.log(existing.family_id, 'UPDATE', 'BUDGET', id, updates);
    return true;
  },

  deleteBudget(id: string): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget | undefined;
    if (!existing) return false;

    db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
    auditService.log(existing.family_id, 'DELETE', 'BUDGET', id, { amount: existing.amount });
    return true;
  }
};
