import { getDb } from '@/lib/db';

export interface SearchResultItem {
  id: string;
  type: 'transaction' | 'account' | 'category' | 'member' | 'goal' | 'debt' | 'asset' | 'subscription';
  title: string;
  subtitle: string;
  url: string;
  amount?: number;
  badge?: string;
}

export const searchService = {
  globalSearch(familyId: string, query: string): SearchResultItem[] {
    if (!query || query.trim().length < 2) return [];
    const db = getDb();
    const q = `%${query.trim()}%`;
    const results: SearchResultItem[] = [];

    // 1. Transactions
    const txs = db.prepare(`
      SELECT id, description, amount, type, date, merchant
      FROM transactions
      WHERE family_id = ? AND (description LIKE ? OR merchant LIKE ? OR tags LIKE ? OR notes LIKE ?)
      ORDER BY date DESC
      LIMIT 6
    `).all(familyId, q, q, q, q) as { id: string; description: string; amount: number; type: string; date: string; merchant: string }[];

    for (const t of txs) {
      results.push({
        id: t.id,
        type: 'transaction',
        title: t.description || 'Transaction',
        subtitle: `${t.date} • ${t.type.toUpperCase()}${t.merchant ? ` • ${t.merchant}` : ''}`,
        url: `/transactions?search=${encodeURIComponent(t.description)}`,
        amount: t.amount,
        badge: t.type
      });
    }

    // 2. Accounts
    const accs = db.prepare(`
      SELECT id, name, type, current_balance, institution
      FROM accounts
      WHERE family_id = ? AND status = 'active' AND (name LIKE ? OR institution LIKE ?)
      LIMIT 4
    `).all(familyId, q, q) as { id: string; name: string; type: string; current_balance: number; institution: string }[];

    for (const a of accs) {
      results.push({
        id: a.id,
        type: 'account',
        title: a.name,
        subtitle: `${a.institution} • ${a.type.replace('_', ' ')}`,
        url: `/accounts`,
        amount: a.current_balance,
        badge: 'Account'
      });
    }

    // 3. Family Members
    const members = db.prepare(`
      SELECT id, name, relationship, role
      FROM family_members
      WHERE family_id = ? AND status = 'active' AND (name LIKE ? OR relationship LIKE ?)
      LIMIT 4
    `).all(familyId, q, q) as { id: string; name: string; relationship: string; role: string }[];

    for (const m of members) {
      results.push({
        id: m.id,
        type: 'member',
        title: m.name,
        subtitle: `${m.relationship} • ${m.role}`,
        url: `/family-members`,
        badge: 'Member'
      });
    }

    // 4. Savings Goals
    const goals = db.prepare(`
      SELECT id, name, target_amount, current_amount
      FROM savings_goals
      WHERE family_id = ? AND (name LIKE ? OR description LIKE ?)
      LIMIT 4
    `).all(familyId, q, q) as { id: string; name: string; target_amount: number; current_amount: number }[];

    for (const g of goals) {
      results.push({
        id: g.id,
        type: 'goal',
        title: g.name,
        subtitle: `Target: $${g.target_amount} • Current: $${g.current_amount}`,
        url: `/savings-goals`,
        amount: g.current_amount,
        badge: 'Savings Goal'
      });
    }

    // 5. Debts
    const debts = db.prepare(`
      SELECT id, name, creditor_debtor, remaining_balance
      FROM debts
      WHERE family_id = ? AND (name LIKE ? OR creditor_debtor LIKE ?)
      LIMIT 4
    `).all(familyId, q, q) as { id: string; name: string; creditor_debtor: string; remaining_balance: number }[];

    for (const d of debts) {
      results.push({
        id: d.id,
        type: 'debt',
        title: d.name,
        subtitle: `Creditor: ${d.creditor_debtor} • Remaining: $${d.remaining_balance}`,
        url: `/debts`,
        amount: d.remaining_balance,
        badge: 'Debt'
      });
    }

    // 6. Subscriptions
    const subs = db.prepare(`
      SELECT id, name, amount, billing_frequency
      FROM subscriptions
      WHERE family_id = ? AND name LIKE ?
      LIMIT 4
    `).all(familyId, q) as { id: string; name: string; amount: number; billing_frequency: string }[];

    for (const s of subs) {
      results.push({
        id: s.id,
        type: 'subscription',
        title: s.name,
        subtitle: `${s.billing_frequency} subscription • $${s.amount}`,
        url: `/subscriptions`,
        amount: s.amount,
        badge: 'Subscription'
      });
    }

    // 7. Assets
    const assets = db.prepare(`
      SELECT id, name, current_value, asset_type
      FROM assets
      WHERE family_id = ? AND (name LIKE ? OR asset_type LIKE ?)
      LIMIT 4
    `).all(familyId, q, q) as { id: string; name: string; current_value: number; asset_type: string }[];

    for (const ast of assets) {
      results.push({
        id: ast.id,
        type: 'asset',
        title: ast.name,
        subtitle: `${ast.asset_type.replace('_', ' ')} • $${ast.current_value}`,
        url: `/assets`,
        amount: ast.current_value,
        badge: 'Asset'
      });
    }

    return results;
  }
};
