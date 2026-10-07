import { getDb } from '@/lib/db';
import crypto from 'crypto';

export interface NotificationItem {
  id: string;
  family_id: string;
  type: 'budget_alert' | 'bill_due' | 'subscription_renewal' | 'savings_milestone' | 'low_balance' | 'system';
  title: string;
  message: string;
  link?: string;
  is_read: number;
  created_at: string;
}

export const notificationService = {
  getNotifications(familyId: string, limit: number = 30): { notifications: NotificationItem[]; unreadCount: number } {
    const db = getDb();
    // Auto-generate notifications for any new system events
    this.checkAndGenerateAlerts(familyId);

    const rows = db.prepare(`
      SELECT * FROM notifications
      WHERE family_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(familyId, limit) as NotificationItem[];

    const unreadRow = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE family_id = ? AND is_read = 0').get(familyId) as { count: number };

    return {
      notifications: rows,
      unreadCount: unreadRow ? unreadRow.count : 0
    };
  },

  createNotification(familyId: string, data: {
    type: NotificationItem['type'];
    title: string;
    message: string;
    link?: string;
  }): NotificationItem {
    const db = getDb();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO notifications (id, family_id, type, title, message, link, is_read)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(id, familyId, data.type, data.title, data.message, data.link || null);

    return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as NotificationItem;
  },

  markAsRead(id: string): boolean {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    return true;
  },

  markAllAsRead(familyId: string): boolean {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE family_id = ?').run(familyId);
    return true;
  },

  deleteNotification(id: string): boolean {
    const db = getDb();
    db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
    return true;
  },

  checkAndGenerateAlerts(familyId: string) {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // 1. Low account balance alert (< $100 and not credit card)
    const lowAccounts = db.prepare(`
      SELECT * FROM accounts
      WHERE family_id = ? AND status = 'active' AND type != 'credit_card' AND current_balance < 100
    `).all(familyId) as { id: string; name: string; current_balance: number }[];

    for (const acc of lowAccounts) {
      const existing = db.prepare(`
        SELECT id FROM notifications 
        WHERE family_id = ? AND type = 'low_balance' AND title LIKE ? AND created_at >= date('now', '-2 days')
      `).get(familyId, `%${acc.name}%`);

      if (!existing) {
        this.createNotification(familyId, {
          type: 'low_balance',
          title: `Low Balance Warning: ${acc.name}`,
          message: `Account balance is down to $${acc.current_balance.toFixed(2)}. Consider topping up or transferring funds.`,
          link: '/accounts'
        });
      }
    }

    // 2. Subscriptions renewing soon (next 3 days)
    const upcomingSubs = db.prepare(`
      SELECT * FROM subscriptions
      WHERE family_id = ? AND status = 'active' AND next_billing_date <= date('now', '+3 days') AND next_billing_date >= date('now')
    `).all(familyId) as { id: string; name: string; amount: number; next_billing_date: string }[];

    for (const sub of upcomingSubs) {
      const existing = db.prepare(`
        SELECT id FROM notifications 
        WHERE family_id = ? AND type = 'subscription_renewal' AND title LIKE ? AND created_at >= date('now', '-3 days')
      `).get(familyId, `%${sub.name}%`);

      if (!existing) {
        this.createNotification(familyId, {
          type: 'subscription_renewal',
          title: `Upcoming Renewal: ${sub.name}`,
          message: `$${sub.amount.toFixed(2)} renewal scheduled for ${sub.next_billing_date}.`,
          link: '/subscriptions'
        });
      }
    }
  }
};
