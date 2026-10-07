import { getDb } from '@/lib/db';

export function resetToCleanFamilyData(): { success: boolean; message: string } {
  const db = getDb();
  const familyId = 'fam-demo-001';

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. Delete all transactional child data first (foreign keys)
    db.prepare('DELETE FROM savings_contributions WHERE goal_id IN (SELECT id FROM savings_goals WHERE family_id = ?)').run(familyId);
    db.prepare('DELETE FROM debt_payments WHERE debt_id IN (SELECT id FROM debts WHERE family_id = ?)').run(familyId);
    db.prepare('DELETE FROM transactions WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM recurring_transactions WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM subscriptions WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM debts WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM savings_goals WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM assets WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM liabilities WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM budgets WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM notifications WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM audit_logs WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM accounts WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM family_members WHERE family_id = ?').run(familyId);
    db.prepare('DELETE FROM users WHERE family_id = ?').run(familyId);

    // 2. Ensure family record is named Miakhil Family
    db.prepare(`
      INSERT OR REPLACE INTO families (id, name, currency, created_at, updated_at)
      VALUES (?, 'Miakhil Family', 'USD', datetime('now'), datetime('now'))
    `).run(familyId);

    // 3. Create Admin User
    db.prepare(`
      INSERT OR REPLACE INTO users (id, family_id, name, email, role, created_at)
      VALUES ('user-admin-miakhil', ?, 'Miakhil Family Admin', 'miakhilfamily', 'admin', datetime('now'))
    `).run(familyId);

    // 4. Create Primary Family Member
    db.prepare(`
      INSERT INTO family_members (
        id, family_id, name, relationship, email, phone, role, avatar_color, monthly_budget_cap, status, created_at
      ) VALUES (
        'mem-admin-01', ?, 'Miakhil Family Head', 'Head of Household', 'miakhil@family.portal', '', 'Family Admin', '#6366F1', 0, 'active', datetime('now')
      )
    `).run(familyId);

    // 5. Create 1 clean initial bank account ($0 balance) so ledger is ready
    db.prepare(`
      INSERT INTO accounts (
        id, family_id, name, type, institution, account_number_mask, currency,
        initial_balance, current_balance, credit_limit, status, color, icon, created_at, updated_at
      ) VALUES (
        'acc-main-01', ?, 'Primary Family Account', 'bank', 'Primary Bank', '•••• 0001', 'USD',
        0, 0, 0, 'active', '#4F46E5', 'landmark', datetime('now'), datetime('now')
      )
    `).run(familyId);

    // 6. Ensure default categories exist if missing
    const existingCats = db.prepare('SELECT COUNT(*) as count FROM categories WHERE family_id = ?').get(familyId) as { count: number };
    if (existingCats.count === 0) {
      const categories = [
        // Income
        { id: 'cat-inc-salary', name: 'Salary & Compensation', type: 'income', icon: 'briefcase', color: '#10B981', parent: null },
        { id: 'cat-inc-business', name: 'Business & Ventures', type: 'income', icon: 'trending-up', color: '#3B82F6', parent: null },
        { id: 'cat-inc-investment', name: 'Investment Returns', type: 'income', icon: 'award', color: '#059669', parent: null },
        { id: 'cat-inc-other', name: 'Other Income', type: 'income', icon: 'dollar-sign', color: '#8B5CF6', parent: null },
        // Expenses
        { id: 'cat-exp-housing', name: 'Housing & Rent', type: 'expense', icon: 'home', color: '#6366F1', parent: null },
        { id: 'cat-exp-groceries', name: 'Groceries & Household', type: 'expense', icon: 'shopping-cart', color: '#F59E0B', parent: null },
        { id: 'cat-exp-dining', name: 'Dining & Restaurants', type: 'expense', icon: 'coffee', color: '#D97706', parent: null },
        { id: 'cat-exp-utilities', name: 'Utilities & Bills', type: 'expense', icon: 'zap', color: '#06B6D4', parent: null },
        { id: 'cat-exp-transport', name: 'Transportation & Fuel', type: 'expense', icon: 'car', color: '#EC4899', parent: null },
        { id: 'cat-exp-health', name: 'Healthcare & Medical', type: 'expense', icon: 'heart', color: '#EF4444', parent: null },
        { id: 'cat-exp-education', name: 'Education & Kids', type: 'expense', icon: 'book-open', color: '#84CC16', parent: null },
        { id: 'cat-exp-shopping', name: 'Shopping & Personal', type: 'expense', icon: 'shopping-bag', color: '#14B8A6', parent: null },
        { id: 'cat-exp-debt', name: 'Loan & Debt Repayment', type: 'expense', icon: 'landmark', color: '#DC2626', parent: null }
      ];

      for (const c of categories) {
        db.prepare(`
          INSERT INTO categories (id, family_id, name, type, parent_id, icon, color, is_system, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
        `).run(c.id, familyId, c.name, c.type, c.parent, c.icon, c.color);
      }
    }

    db.exec('COMMIT;');
    return { success: true, message: 'All demo static data successfully purged. Clean slate initialized for Miakhil Family.' };
  } catch (err: unknown) {
    db.exec('ROLLBACK;');
    const msg = err instanceof Error ? err.message : 'Database cleanup failed';
    throw new Error(msg);
  }
}
