import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { auditService } from './auditService';

export interface SavingsGoal {
  id: string;
  family_id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string;
  priority: 'low' | 'medium' | 'high';
  category_id?: string;
  linked_account_id?: string;
  monthly_target: number;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
  // Computed
  linked_account_name?: string;
  remaining_amount: number;
  progress_percentage: number;
  months_remaining: number;
  suggested_monthly_contribution: number;
}

export interface SavingsContribution {
  id: string;
  goal_id: string;
  account_id: string;
  account_name?: string;
  amount: number;
  date: string;
  notes?: string;
  created_at: string;
}

export const savingsService = {
  getGoals(familyId: string): SavingsGoal[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        g.*,
        a.name as linked_account_name
      FROM savings_goals g
      LEFT JOIN accounts a ON g.linked_account_id = a.id
      WHERE g.family_id = ?
      ORDER BY 
        CASE g.status WHEN 'active' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
        g.target_date ASC
    `).all(familyId) as (SavingsGoal & { linked_account_name?: string })[];

    const today = new Date();

    return rows.map((g) => {
      const remaining = Math.max(0, Number((g.target_amount - g.current_amount).toFixed(2)));
      const progress = g.target_amount > 0 ? Math.min(100, Number(((g.current_amount / g.target_amount) * 100).toFixed(1))) : 0;

      // Months remaining calculation
      const targetDate = new Date(g.target_date);
      const diffMonths = Math.max(1, (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth()));
      const suggestedMonthly = remaining > 0 ? Number((remaining / diffMonths).toFixed(2)) : 0;

      return {
        ...g,
        remaining_amount: remaining,
        progress_percentage: progress,
        months_remaining: diffMonths,
        suggested_monthly_contribution: suggestedMonthly
      };
    });
  },

  getGoalById(id: string): SavingsGoal | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT g.*, a.name as linked_account_name
      FROM savings_goals g
      LEFT JOIN accounts a ON g.linked_account_id = a.id
      WHERE g.id = ?
    `).get(id) as (SavingsGoal & { linked_account_name?: string }) | undefined;

    if (!row) return null;
    const remaining = Math.max(0, Number((row.target_amount - row.current_amount).toFixed(2)));
    const progress = row.target_amount > 0 ? Math.min(100, Number(((row.current_amount / row.target_amount) * 100).toFixed(1))) : 0;

    return {
      ...row,
      remaining_amount: remaining,
      progress_percentage: progress,
      months_remaining: 6,
      suggested_monthly_contribution: remaining > 0 ? Number((remaining / 6).toFixed(2)) : 0
    };
  },

  createGoal(familyId: string, data: {
    name: string;
    description?: string;
    target_amount: number;
    current_amount?: number;
    currency?: string;
    target_date: string;
    priority?: 'low' | 'medium' | 'high';
    category_id?: string;
    linked_account_id?: string;
    monthly_target?: number;
  }): SavingsGoal {
    const db = getDb();
    const id = crypto.randomUUID();
    const current = data.current_amount || 0;

    db.prepare(`
      INSERT INTO savings_goals (
        id, family_id, name, description, target_amount, current_amount,
        currency, target_date, priority, category_id, linked_account_id,
        monthly_target, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      id,
      familyId,
      data.name,
      data.description || null,
      data.target_amount,
      current,
      data.currency || 'USD',
      data.target_date,
      data.priority || 'medium',
      data.category_id || null,
      data.linked_account_id || null,
      data.monthly_target || 0
    );

    auditService.log(familyId, 'CREATE', 'SAVINGS_GOAL', id, { name: data.name, target_amount: data.target_amount });
    return this.getGoalById(id)!;
  },

  addContribution(goalId: string, data: {
    account_id: string;
    amount: number;
    date: string;
    notes?: string;
  }): { contributionId: string; newGoalAmount: number } {
    const db = getDb();
    const goal = this.getGoalById(goalId);
    if (!goal) throw new Error('Savings goal not found');
    if (data.amount <= 0) throw new Error('Contribution amount must be greater than zero');

    const contributionId = crypto.randomUUID();

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Record contribution
      db.prepare(`
        INSERT INTO savings_contributions (id, goal_id, account_id, amount, date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(contributionId, goalId, data.account_id, data.amount, data.date, data.notes || null);

      // 2. Increase goal current amount
      const newTotal = goal.current_amount + data.amount;
      const isCompleted = newTotal >= goal.target_amount;
      db.prepare(`
        UPDATE savings_goals
        SET current_amount = ?,
            status = CASE WHEN ? >= target_amount THEN 'completed' ELSE status END,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(newTotal, newTotal, goalId);

      // 3. Debit source account balance
      db.prepare('UPDATE accounts SET current_balance = current_balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(data.amount, data.account_id);

      db.exec('COMMIT;');

      auditService.log(goal.family_id, 'CREATE', 'SAVINGS_GOAL', goalId, {
        action: 'contribution',
        amount: data.amount,
        account_id: data.account_id,
        completed: isCompleted
      });

      return { contributionId, newGoalAmount: newTotal };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  getContributions(goalId: string): SavingsContribution[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT c.*, a.name as account_name
      FROM savings_contributions c
      LEFT JOIN accounts a ON c.account_id = a.id
      WHERE c.goal_id = ?
      ORDER BY c.date DESC, c.created_at DESC
    `).all(goalId) as (SavingsContribution & { account_name?: string })[];
    return rows;
  },

  updateGoal(id: string, updates: Partial<SavingsGoal>): boolean {
    const db = getDb();
    const existing = this.getGoalById(id);
    if (!existing) return false;

    db.prepare(`
      UPDATE savings_goals
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          target_amount = COALESCE(?, target_amount),
          target_date = COALESCE(?, target_date),
          priority = COALESCE(?, priority),
          linked_account_id = COALESCE(?, linked_account_id),
          monthly_target = COALESCE(?, monthly_target),
          status = COALESCE(?, status),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.description ?? null,
      updates.target_amount ?? null,
      updates.target_date ?? null,
      updates.priority ?? null,
      updates.linked_account_id ?? null,
      updates.monthly_target ?? null,
      updates.status ?? null,
      id
    );

    auditService.log(existing.family_id, 'UPDATE', 'SAVINGS_GOAL', id, updates);
    return true;
  },

  deleteGoal(id: string): boolean {
    const db = getDb();
    const existing = this.getGoalById(id);
    if (!existing) return false;

    db.prepare('DELETE FROM savings_goals WHERE id = ?').run(id);
    auditService.log(existing.family_id, 'DELETE', 'SAVINGS_GOAL', id, { name: existing.name });
    return true;
  }
};
