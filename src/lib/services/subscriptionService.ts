import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { auditService } from './auditService';

export interface Subscription {
  id: string;
  family_id: string;
  name: string;
  category_id?: string;
  account_id: string;
  amount: number;
  billing_frequency: 'monthly' | 'yearly' | 'quarterly';
  next_billing_date: string;
  status: 'active' | 'cancelled' | 'paused';
  reminder_days_before: number;
  icon: string;
  created_at: string;
  // Computed
  account_name?: string;
  category_name?: string;
  monthly_cost: number;
  yearly_cost: number;
  days_until_renewal: number;
}

export const subscriptionService = {
  getSubscriptions(familyId: string): {
    subscriptions: Subscription[];
    totalMonthlyCost: number;
    totalYearlyCost: number;
    activeCount: number;
  } {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        s.*,
        a.name as account_name,
        c.name as category_name
      FROM subscriptions s
      LEFT JOIN accounts a ON s.account_id = a.id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.family_id = ?
      ORDER BY 
        CASE s.status WHEN 'active' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
        s.next_billing_date ASC
    `).all(familyId) as (Subscription & { account_name?: string; category_name?: string })[];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalMonthlyCost = 0;
    let totalYearlyCost = 0;
    let activeCount = 0;

    const list: Subscription[] = rows.map((s) => {
      let monthly = s.amount;
      let yearly = s.amount * 12;

      if (s.billing_frequency === 'yearly') {
        monthly = Number((s.amount / 12).toFixed(2));
        yearly = s.amount;
      } else if (s.billing_frequency === 'quarterly') {
        monthly = Number((s.amount / 3).toFixed(2));
        yearly = s.amount * 4;
      }

      if (s.status === 'active') {
        totalMonthlyCost += monthly;
        totalYearlyCost += yearly;
        activeCount++;
      }

      const nextDate = new Date(s.next_billing_date);
      const diffTime = nextDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...s,
        monthly_cost: monthly,
        yearly_cost: yearly,
        days_until_renewal: diffDays
      };
    });

    return {
      subscriptions: list,
      totalMonthlyCost: Number(totalMonthlyCost.toFixed(2)),
      totalYearlyCost: Number(totalYearlyCost.toFixed(2)),
      activeCount
    };
  },

  createSubscription(familyId: string, data: {
    name: string;
    category_id?: string;
    account_id: string;
    amount: number;
    billing_frequency?: Subscription['billing_frequency'];
    next_billing_date: string;
    icon?: string;
    reminder_days_before?: number;
  }): Subscription {
    const db = getDb();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO subscriptions (
        id, family_id, name, category_id, account_id, amount,
        billing_frequency, next_billing_date, status, reminder_days_before, icon
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(
      id,
      familyId,
      data.name,
      data.category_id || null,
      data.account_id,
      data.amount,
      data.billing_frequency || 'monthly',
      data.next_billing_date,
      data.reminder_days_before || 3,
      data.icon || 'credit-card'
    );

    auditService.log(familyId, 'CREATE', 'SUBSCRIPTION', id, { name: data.name, amount: data.amount });
    const res = this.getSubscriptions(familyId);
    return res.subscriptions.find((s) => s.id === id)!;
  },

  updateSubscription(id: string, updates: Partial<Subscription>): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as Subscription | undefined;
    if (!existing) return false;

    db.prepare(`
      UPDATE subscriptions
      SET name = COALESCE(?, name),
          amount = COALESCE(?, amount),
          billing_frequency = COALESCE(?, billing_frequency),
          next_billing_date = COALESCE(?, next_billing_date),
          account_id = COALESCE(?, account_id),
          category_id = COALESCE(?, category_id),
          status = COALESCE(?, status),
          reminder_days_before = COALESCE(?, reminder_days_before)
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.amount ?? null,
      updates.billing_frequency ?? null,
      updates.next_billing_date ?? null,
      updates.account_id ?? null,
      updates.category_id ?? null,
      updates.status ?? null,
      updates.reminder_days_before ?? null,
      id
    );

    auditService.log(existing.family_id, 'UPDATE', 'SUBSCRIPTION', id, updates);
    return true;
  },

  deleteSubscription(id: string): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as Subscription | undefined;
    if (!existing) return false;

    db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
    auditService.log(existing.family_id, 'DELETE', 'SUBSCRIPTION', id, { name: existing.name });
    return true;
  }
};
