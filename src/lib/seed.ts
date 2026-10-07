import { getDb } from '@/lib/db';
import crypto from 'crypto';

export function seedDemoData(force: boolean = false): { success: boolean; message: string; familyId: string } {
  const db = getDb();

  // Check if family already exists
  const existingFamily = db.prepare("SELECT id FROM families WHERE id = 'fam-demo-001'").get() as { id: string } | undefined;
  if (existingFamily && !force) {
    return { success: true, message: 'Demo data already exists', familyId: existingFamily.id };
  }

  const familyId = 'fam-demo-001';

  db.exec('BEGIN TRANSACTION;');
  try {
    // Clean up if force
    if (existingFamily && force) {
      db.prepare('DELETE FROM families WHERE id = ?').run(familyId);
    }

    // 1. Family
    db.prepare(`
      INSERT INTO families (id, name, currency, created_at)
      VALUES (?, 'The Henderson Family', 'USD', datetime('now', '-90 days'))
    `).run(familyId);

    // 2. Users & Family Members
    const members = [
      { id: 'mem-1', name: 'David Henderson', rel: 'Father', role: 'Family Admin', email: 'david@henderson.family', phone: '+1 555-0101', color: '#3B82F6', cap: 4500 },
      { id: 'mem-2', name: 'Sarah Henderson', rel: 'Mother', role: 'Adult Member', email: 'sarah@henderson.family', phone: '+1 555-0102', color: '#EC4899', cap: 4200 },
      { id: 'mem-3', name: 'Leo Henderson', rel: 'Son', role: 'Limited Member', email: 'leo@henderson.family', phone: '+1 555-0103', color: '#10B981', cap: 600 },
      { id: 'mem-4', name: 'Maya Henderson', rel: 'Daughter', role: 'Limited Member', email: 'maya@henderson.family', phone: '+1 555-0104', color: '#F59E0B', cap: 500 }
    ];

    for (const m of members) {
      db.prepare(`
        INSERT INTO family_members (id, family_id, name, relationship, email, phone, role, avatar_color, monthly_budget_cap, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(m.id, familyId, m.name, m.rel, m.email, m.phone, m.role, m.color, m.cap);
    }

    // Default User
    db.prepare(`
      INSERT INTO users (id, family_id, name, email, role, created_at)
      VALUES ('user-admin-1', ?, 'David Henderson', 'david@henderson.family', 'admin', datetime('now', '-90 days'))
    `).run(familyId);

    // 3. Accounts
    const accounts = [
      { id: 'acc-1', name: 'Chase Premier Checking', type: 'bank', inst: 'Chase Bank', mask: '•••• 4821', init: 4250.00, bal: 7850.40, color: '#2563EB', icon: 'landmark', limit: 0 },
      { id: 'acc-2', name: 'Ally High-Yield Savings', type: 'savings', inst: 'Ally Financial', mask: '•••• 9104', init: 18500.00, bal: 26420.80, color: '#10B981', icon: 'piggy-bank', limit: 0 },
      { id: 'acc-3', name: 'Chase Sapphire Preferred', type: 'credit_card', inst: 'Chase Bank', mask: '•••• 3390', init: 0, bal: 1420.50, color: '#8B5CF6', icon: 'credit-card', limit: 15000 },
      { id: 'acc-4', name: 'Household Cash Wallet', type: 'cash', inst: 'Cash Box', mask: 'CASH', init: 350.00, bal: 420.00, color: '#F59E0B', icon: 'wallet', limit: 0 },
      { id: 'acc-5', name: 'Vanguard Index Portfolio', type: 'investment', inst: 'Vanguard', mask: '•••• 7712', init: 65000.00, bal: 84500.00, color: '#0EA5E9', icon: 'trending-up', limit: 0 }
    ];

    for (const a of accounts) {
      db.prepare(`
        INSERT INTO accounts (id, family_id, name, type, institution, account_number_mask, currency, initial_balance, current_balance, credit_limit, status, color, icon)
        VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, 'active', ?, ?)
      `).run(a.id, familyId, a.name, a.type, a.inst, a.mask, a.init, a.bal, a.limit, a.color, a.icon);
    }

    // 4. Categories & Subcategories
    const categories = [
      // Income
      { id: 'cat-inc-salary', name: 'Salary & Compensation', type: 'income', icon: 'briefcase', color: '#10B981', parent: null },
      { id: 'cat-inc-bonus', name: 'Bonus & Incentives', type: 'income', icon: 'award', color: '#059669', parent: 'cat-inc-salary' },
      { id: 'cat-inc-investment', name: 'Investment Dividends', type: 'income', icon: 'trending-up', color: '#3B82F6', parent: null },
      { id: 'cat-inc-freelance', name: 'Consulting & Freelance', type: 'income', icon: 'laptop', color: '#8B5CF6', parent: null },
      // Expenses
      { id: 'cat-exp-housing', name: 'Housing', type: 'expense', icon: 'home', color: '#6366F1', parent: null },
      { id: 'cat-exp-mortgage', name: 'Mortgage & Rent', type: 'expense', icon: 'key', color: '#4F46E5', parent: 'cat-exp-housing' },
      { id: 'cat-exp-maintenance', name: 'Home Repairs', type: 'expense', icon: 'tool', color: '#4338CA', parent: 'cat-exp-housing' },
      { id: 'cat-exp-food', name: 'Food & Dining', type: 'expense', icon: 'utensils', color: '#F59E0B', parent: null },
      { id: 'cat-exp-groceries', name: 'Groceries & Supplies', type: 'expense', icon: 'shopping-cart', color: '#D97706', parent: 'cat-exp-food' },
      { id: 'cat-exp-restaurants', name: 'Restaurants & Cafes', type: 'expense', icon: 'coffee', color: '#B45309', parent: 'cat-exp-food' },
      { id: 'cat-exp-transport', name: 'Transportation', type: 'expense', icon: 'car', color: '#EC4899', parent: null },
      { id: 'cat-exp-fuel', name: 'Fuel & EV Charging', type: 'expense', icon: 'zap', color: '#DB2777', parent: 'cat-exp-transport' },
      { id: 'cat-exp-transit', name: 'Public Transit & Parking', type: 'expense', icon: 'navigation', color: '#BE185D', parent: 'cat-exp-transport' },
      { id: 'cat-exp-utilities', name: 'Utilities & Services', type: 'expense', icon: 'activity', color: '#06B6D4', parent: null },
      { id: 'cat-exp-electric', name: 'Electricity & Gas', type: 'expense', icon: 'sun', color: '#0891B2', parent: 'cat-exp-utilities' },
      { id: 'cat-exp-internet', name: 'Internet & Mobile', type: 'expense', icon: 'wifi', color: '#0E7490', parent: 'cat-exp-utilities' },
      { id: 'cat-exp-health', name: 'Healthcare & Wellness', type: 'expense', icon: 'heart', color: '#EF4444', parent: null },
      { id: 'cat-exp-education', name: 'Education & Kids', type: 'expense', icon: 'book-open', color: '#84CC16', parent: null },
      { id: 'cat-exp-entertainment', name: 'Entertainment & Leisure', type: 'expense', icon: 'film', color: '#A855F7', parent: null },
      { id: 'cat-exp-shopping', name: 'Shopping & Gear', type: 'expense', icon: 'shopping-bag', color: '#14B8A6', parent: null },
      { id: 'cat-exp-debt', name: 'Debt & Loan Payments', type: 'expense', icon: 'landmark', color: '#DC2626', parent: null }
    ];

    for (const c of categories) {
      db.prepare(`
        INSERT INTO categories (id, family_id, name, type, parent_id, icon, color, is_system, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
      `).run(c.id, familyId, c.name, c.type, c.parent || null, c.icon, c.color);
    }

    // 5. Budgets
    const budgets = [
      { id: 'b-1', cat: 'cat-exp-groceries', amt: 1200, thresh: 0.85 },
      { id: 'b-2', cat: 'cat-exp-restaurants', amt: 550, thresh: 0.80 },
      { id: 'b-3', cat: 'cat-exp-transport', amt: 450, thresh: 0.85 },
      { id: 'b-4', cat: 'cat-exp-utilities', amt: 400, thresh: 0.90 },
      { id: 'b-5', cat: 'cat-exp-entertainment', amt: 350, thresh: 0.85 },
      { id: 'b-6', cat: 'cat-exp-shopping', amt: 600, thresh: 0.85 }
    ];

    for (const b of budgets) {
      db.prepare(`
        INSERT INTO budgets (id, family_id, category_id, period_type, amount, currency, alert_threshold)
        VALUES (?, ?, ?, 'monthly', ?, 'USD', ?)
      `).run(b.id, familyId, b.cat, b.amt, b.thresh);
    }

    // 6. Savings Goals
    const goals = [
      { id: 'sg-1', name: 'Emergency Safety Net (6 Months)', desc: 'Liquid reserves for unexpected events', target: 30000, cur: 21500, date: '2027-06-30', pri: 'high', acc: 'acc-2', mTarget: 800 },
      { id: 'sg-2', name: 'Summer Italian Riviera Holiday', desc: 'Family flights, villas, and seaside dining', target: 7500, cur: 4900, date: '2027-07-15', pri: 'medium', acc: 'acc-2', mTarget: 400 },
      { id: 'sg-3', name: 'Tesla Model Y Down Payment', desc: 'Upgrade household vehicle to all-electric', target: 12000, cur: 6800, date: '2027-11-30', pri: 'medium', acc: 'acc-2', mTarget: 600 },
      { id: 'sg-4', name: 'College Tuition Pre-Fund', desc: '529 education endowment savings', target: 50000, cur: 18200, date: '2030-09-01', pri: 'high', acc: 'acc-5', mTarget: 500 }
    ];

    for (const g of goals) {
      db.prepare(`
        INSERT INTO savings_goals (id, family_id, name, description, target_amount, current_amount, currency, target_date, priority, linked_account_id, monthly_target, status)
        VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, 'active')
      `).run(g.id, familyId, g.name, g.desc, g.target, g.cur, g.date, g.pri, g.acc, g.mTarget);
    }

    // 7. Debts & Loans
    const debts = [
      { id: 'debt-1', name: 'Home Mortgage (30Y Fixed)', type: 'mortgage', cred: 'Wells Fargo Home Mortgage', orig: 480000, rem: 412500, rate: 3.75, start: '2021-04-01', due: '2051-04-01', inst: 2225.00, freq: 'monthly', tot: 360, remInst: 295 },
      { id: 'debt-2', name: 'Family SUV Auto Loan', type: 'bank_loan', cred: 'Chase Auto Finance', orig: 34000, rem: 11200, rate: 4.25, start: '2023-08-15', due: '2027-08-15', inst: 620.00, freq: 'monthly', tot: 48, remInst: 18 },
      { id: 'debt-3', name: 'Home Solar Installation Loan', type: 'personal_loan', cred: 'Clean Energy Credit Union', orig: 18000, rem: 8400, rate: 2.99, start: '2022-09-01', due: '2028-09-01', inst: 285.00, freq: 'monthly', tot: 72, remInst: 32 }
    ];

    for (const d of debts) {
      db.prepare(`
        INSERT INTO debts (id, family_id, name, type, creditor_debtor, original_amount, remaining_balance, interest_rate, start_date, due_date, installment_amount, payment_frequency, total_installments, remaining_installments, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(d.id, familyId, d.name, d.type, d.cred, d.orig, d.rem, d.rate, d.start, d.due, d.inst, d.freq, d.tot, d.remInst);
    }

    // 8. Subscriptions
    const subs = [
      { id: 'sub-1', name: 'Netflix Premium (4K Family)', cat: 'cat-exp-entertainment', acc: 'acc-3', amt: 22.99, freq: 'monthly', next: '2026-10-18', icon: 'tv' },
      { id: 'sub-2', name: 'Spotify Premium Family', cat: 'cat-exp-entertainment', acc: 'acc-3', amt: 19.99, freq: 'monthly', next: '2026-10-22', icon: 'music' },
      { id: 'sub-3', name: 'Amazon Prime Annual', cat: 'cat-exp-shopping', acc: 'acc-1', amt: 139.00, freq: 'yearly', next: '2026-12-05', icon: 'package' },
      { id: 'sub-4', name: 'Equinox Family Fitness Club', cat: 'cat-exp-health', acc: 'acc-1', amt: 260.00, freq: 'monthly', next: '2026-10-15', icon: 'activity' },
      { id: 'sub-5', name: 'Google One 2TB Cloud Storage', cat: 'cat-exp-utilities', acc: 'acc-3', amt: 9.99, freq: 'monthly', next: '2026-10-28', icon: 'cloud' },
      { id: 'sub-6', name: 'AT&T Fiber 1 Gbps Internet', cat: 'cat-exp-internet', acc: 'acc-1', amt: 85.00, freq: 'monthly', next: '2026-10-25', icon: 'wifi' }
    ];

    for (const s of subs) {
      db.prepare(`
        INSERT INTO subscriptions (id, family_id, name, category_id, account_id, amount, billing_frequency, next_billing_date, status, reminder_days_before, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 3, ?)
      `).run(s.id, familyId, s.name, s.cat, s.acc, s.amt, s.freq, s.next, s.icon);
    }

    // 9. Assets & Liabilities
    const assets = [
      { id: 'ast-1', name: 'Family Primary Residence (4BR/3BA)', type: 'real_estate', buy: 540000, cur: 715000, date: '2021-04-01', loc: 'Austin, TX', mem: 'mem-1' },
      { id: 'ast-2', name: '2023 Audi Q5 Quattro', type: 'vehicle', buy: 46000, cur: 34500, date: '2023-08-15', loc: 'Garage', mem: 'mem-2' },
      { id: 'ast-3', name: '2021 Honda Civic EX', type: 'vehicle', buy: 24000, cur: 18500, date: '2021-06-10', loc: 'Garage', mem: 'mem-1' },
      { id: 'ast-4', name: 'Physical Gold Bullion & Coins', type: 'gold_jewelry', buy: 12500, cur: 17200, date: '2022-01-15', loc: 'Home Safe', mem: 'mem-1' }
    ];

    for (const a of assets) {
      db.prepare(`
        INSERT INTO assets (id, family_id, name, asset_type, purchase_price, current_value, purchase_date, location, family_member_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(a.id, familyId, a.name, a.type, a.buy, a.cur, a.date, a.loc, a.mem);
    }

    const liabilities = [
      { id: 'liab-1', name: 'Home Mortgage Balance', type: 'mortgage', orig: 480000, cur: 412500, rate: 3.75, mo: 2225, due: '2026-11-01', debtId: 'debt-1' },
      { id: 'liab-2', name: 'Audi Auto Loan Balance', type: 'car_loan', orig: 34000, cur: 11200, rate: 4.25, mo: 620, due: '2026-10-15', debtId: 'debt-2' },
      { id: 'liab-3', name: 'Solar Installation Loan', type: 'personal_loan', orig: 18000, cur: 8400, rate: 2.99, mo: 285, due: '2026-10-20', debtId: 'debt-3' }
    ];

    for (const l of liabilities) {
      db.prepare(`
        INSERT INTO liabilities (id, family_id, name, liability_type, original_amount, current_balance, interest_rate, monthly_payment, due_date, linked_debt_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(l.id, familyId, l.name, l.type, l.orig, l.cur, l.rate, l.mo, l.due, l.debtId);
    }

    // 10. Realistic Transactions (Spread across recent weeks and this month)
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');

    const txs = [
      // Incomes
      { desc: 'David Tech Corp Salary (1st Half)', amt: 5200.00, type: 'income', cat: 'cat-inc-salary', acc: 'acc-1', mem: 'mem-1', date: `${y}-${m}-01`, pay: 'Direct Deposit' },
      { desc: 'Sarah Healthcare Director Salary', amt: 4650.00, type: 'income', cat: 'cat-inc-salary', acc: 'acc-1', mem: 'mem-2', date: `${y}-${m}-02`, pay: 'Direct Deposit' },
      { desc: 'Vanguard Dividend Payout', amt: 480.00, type: 'income', cat: 'cat-inc-investment', acc: 'acc-5', mem: 'mem-1', date: `${y}-${m}-04`, pay: 'Reinvested' },
      { desc: 'Consulting Advisory Project', amt: 1250.00, type: 'income', cat: 'cat-inc-freelance', acc: 'acc-1', mem: 'mem-1', date: `${y}-${m}-05`, pay: 'ACH Transfer' },

      // Transfer
      { desc: 'Monthly Automated Savings Allocation', amt: 1500.00, type: 'transfer', acc: 'acc-1', toAcc: 'acc-2', mem: 'mem-1', date: `${y}-${m}-03`, pay: 'Transfer' },

      // Major fixed expenses
      { desc: 'Wells Fargo Mortgage Payment', amt: 2225.00, type: 'expense', cat: 'cat-exp-mortgage', acc: 'acc-1', mem: 'mem-1', date: `${y}-${m}-01`, pay: 'Auto-Debit', merch: 'Wells Fargo' },
      { desc: 'Audi Auto Loan Installment', amt: 620.00, type: 'expense', cat: 'cat-exp-debt', acc: 'acc-1', mem: 'mem-2', date: `${y}-${m}-03`, pay: 'Auto-Debit', merch: 'Chase Auto' },

      // Food & Groceries
      { desc: 'Whole Foods Market Weekly Stockup', amt: 284.50, type: 'expense', cat: 'cat-exp-groceries', acc: 'acc-3', mem: 'mem-2', date: `${y}-${m}-02`, pay: 'Card', merch: 'Whole Foods', tags: 'organic,groceries' },
      { desc: 'Trader Joe\'s Pantry Essentials', amt: 142.30, type: 'expense', cat: 'cat-exp-groceries', acc: 'acc-3', mem: 'mem-2', date: `${y}-${m}-04`, pay: 'Card', merch: 'Trader Joe\'s' },
      { desc: 'Costco Wholesale Bulk Run', amt: 345.80, type: 'expense', cat: 'cat-exp-groceries', acc: 'acc-3', mem: 'mem-1', date: `${y}-${m}-05`, pay: 'Card', merch: 'Costco' },
      { desc: 'Italian Osteria Family Dinner', amt: 168.40, type: 'expense', cat: 'cat-exp-restaurants', acc: 'acc-3', mem: 'mem-1', date: `${y}-${m}-05`, pay: 'Card', merch: 'Osteria Del Sole', tags: 'dining,family' },
      { desc: 'Blue Bottle Coffee & Bakery', amt: 24.50, type: 'expense', cat: 'cat-exp-restaurants', acc: 'acc-3', mem: 'mem-1', date: `${y}-${m}-06`, pay: 'Apple Pay', merch: 'Blue Bottle' },

      // Transportation
      { desc: 'Chevron Supreme Fuel', amt: 68.20, type: 'expense', cat: 'cat-exp-fuel', acc: 'acc-3', mem: 'mem-2', date: `${y}-${m}-03`, pay: 'Card', merch: 'Chevron' },
      { desc: 'Tesla Supercharging Station', amt: 28.50, type: 'expense', cat: 'cat-exp-fuel', acc: 'acc-3', mem: 'mem-1', date: `${y}-${m}-06`, pay: 'Card', merch: 'Tesla Energy' },

      // Utilities
      { desc: 'Austin Energy Electric & Water Bill', amt: 215.40, type: 'expense', cat: 'cat-exp-electric', acc: 'acc-1', mem: 'mem-1', date: `${y}-${m}-02`, pay: 'ACH', merch: 'City of Austin' },
      { desc: 'AT&T Fiber High Speed Internet', amt: 85.00, type: 'expense', cat: 'cat-exp-internet', acc: 'acc-1', mem: 'mem-1', date: `${y}-${m}-04`, pay: 'Auto-Debit', merch: 'AT&T' },

      // Kids & Education
      { desc: 'Leo Science Academy Supplies', amt: 84.00, type: 'expense', cat: 'cat-exp-education', acc: 'acc-3', mem: 'mem-3', date: `${y}-${m}-03`, pay: 'Card', merch: 'Barnes & Noble' },
      { desc: 'Maya Gymnastics League Term Fee', amt: 220.00, type: 'expense', cat: 'cat-exp-education', acc: 'acc-1', mem: 'mem-4', date: `${y}-${m}-05`, pay: 'ACH', merch: 'Capital Gymnastics' },

      // Entertainment & Shopping
      { desc: 'Family Cinema Tickets & Popcorn', amt: 72.00, type: 'expense', cat: 'cat-exp-entertainment', acc: 'acc-3', mem: 'mem-1', date: `${y}-${m}-04`, pay: 'Card', merch: 'Alamo Drafthouse' },
      { desc: 'Nordstrom Fall Wardrobe', amt: 185.00, type: 'expense', cat: 'cat-exp-shopping', acc: 'acc-3', mem: 'mem-2', date: `${y}-${m}-06`, pay: 'Card', merch: 'Nordstrom' }
    ];

    for (const t of txs) {
      const txId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO transactions (
          id, family_id, type, amount, currency, exchange_rate, converted_amount,
          date, time, description, category_id, account_id, to_account_id,
          family_member_id, payment_method, merchant, notes, tags
        ) VALUES (?, ?, ?, ?, 'USD', 1.0, ?, ?, '12:00', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        familyId,
        t.type,
        t.amt,
        t.amt,
        t.date,
        t.desc,
        t.cat || null,
        t.acc,
        t.toAcc || null,
        t.mem || null,
        t.pay,
        t.merch || null,
        'Demo household transaction',
        t.tags || null
      );
    }

    // 11. Notifications
    const notifications = [
      { type: 'budget_alert', title: 'Groceries Budget at 64%', msg: 'Spent $772.60 of $1,200 monthly budget. Pace is healthy.', link: '/budgets' },
      { type: 'subscription_renewal', title: 'Netflix Renewal in 11 Days', msg: 'Monthly charge of $22.99 due on Chase Sapphire.', link: '/subscriptions' },
      { type: 'savings_milestone', title: 'Emergency Fund Reached 71%!', msg: 'Total balance is now $21,500 toward the $30,000 goal.', link: '/savings-goals' },
      { type: 'bill_due', title: 'Audi Auto Loan Due Soon', msg: 'Scheduled auto-payment of $620.00 on the 15th.', link: '/debts' }
    ];

    for (const n of notifications) {
      db.prepare(`
        INSERT INTO notifications (id, family_id, type, title, message, link, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now', '-2 hours'))
      `).run(crypto.randomUUID(), familyId, n.type, n.title, n.msg, n.link);
    }

    // 12. Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, family_id, user_id, action, entity, entity_id, details, created_at)
      VALUES (?, ?, 'user-admin-1', 'SEED', 'FAMILY_MEMBER', 'fam-demo-001', '{"action":"Initialized full family finance dataset with accounts, ledger, and goals"}', datetime('now'))
    `).run(crypto.randomUUID(), familyId);

    db.exec('COMMIT;');
    return { success: true, message: 'Seeded comprehensive family finance demo data successfully', familyId };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Seed failed:', err);
    throw err;
  }
}
