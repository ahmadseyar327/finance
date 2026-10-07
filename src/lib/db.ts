import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'finance.db');

// Global database instance caching for Next.js hot reload
const globalForDb = global as unknown as { dbInstance: DatabaseSync | undefined };

export function getDb(): DatabaseSync {
  if (!globalForDb.dbInstance) {
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA journal_mode = DELETE;');
    db.exec('PRAGMA synchronous = NORMAL;');
    initSchema(db);
    globalForDb.dbInstance = db;
  }
  return globalForDb.dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    -- Families
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'admin', -- 'admin', 'adult', 'limited'
      avatar TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Family Members
    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      user_id TEXT,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL, -- 'Father', 'Mother', 'Son', 'Daughter', 'Grandparent', 'Other'
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'Adult Member',
      avatar_color TEXT NOT NULL DEFAULT '#6366F1',
      monthly_budget_cap REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'archived'
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Accounts
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'cash', 'bank', 'savings', 'credit_card', 'debit_card', 'e_wallet', 'investment', 'other'
      institution TEXT NOT NULL,
      account_number_mask TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      initial_balance REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      credit_limit REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'archived'
      color TEXT NOT NULL DEFAULT '#3B82F6',
      icon TEXT NOT NULL DEFAULT 'wallet',
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Categories & Subcategories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'expense', 'income'
      parent_id TEXT,
      icon TEXT NOT NULL DEFAULT 'tag',
      color TEXT NOT NULL DEFAULT '#6B7280',
      is_system INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- Transactions
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'income', 'expense', 'transfer'
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      exchange_rate REAL NOT NULL DEFAULT 1.0,
      converted_amount REAL NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      time TEXT NOT NULL DEFAULT '12:00',
      description TEXT NOT NULL,
      category_id TEXT,
      account_id TEXT NOT NULL,
      to_account_id TEXT, -- for transfers
      family_member_id TEXT,
      payment_method TEXT NOT NULL DEFAULT 'Card',
      merchant TEXT,
      location TEXT,
      notes TEXT,
      receipt_url TEXT,
      tags TEXT, -- comma-separated
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurring_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL
    );

    -- Budgets
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      category_id TEXT,
      family_member_id TEXT,
      account_id TEXT,
      period_type TEXT NOT NULL DEFAULT 'monthly', -- 'weekly', 'monthly', 'yearly', 'custom'
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      alert_threshold REAL NOT NULL DEFAULT 0.85, -- 85% warning threshold
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
    );

    -- Savings Goals
    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      target_date TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
      category_id TEXT,
      linked_account_id TEXT,
      monthly_target REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused'
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (linked_account_id) REFERENCES accounts(id) ON DELETE SET NULL
    );

    -- Savings Contributions
    CREATE TABLE IF NOT EXISTS savings_contributions (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
    );

    -- Debts & Loans
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'personal_loan', 'bank_loan', 'mortgage', 'credit_card', 'lent_to_other', 'borrowed_from_family'
      creditor_debtor TEXT NOT NULL,
      original_amount REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0, -- percentage (e.g. 5.5)
      start_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      installment_amount REAL NOT NULL DEFAULT 0,
      payment_frequency TEXT NOT NULL DEFAULT 'monthly', -- 'weekly', 'biweekly', 'monthly', 'quarterly'
      total_installments INTEGER NOT NULL DEFAULT 12,
      remaining_installments INTEGER NOT NULL DEFAULT 12,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paid_off'
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Debt Payments
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY,
      debt_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      amount REAL NOT NULL,
      principal_amount REAL NOT NULL,
      interest_amount REAL NOT NULL DEFAULT 0,
      payment_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
    );

    -- Recurring Transactions
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'income', 'expense'
      amount REAL NOT NULL,
      category_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      family_member_id TEXT,
      frequency TEXT NOT NULL, -- 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_occurrence TEXT NOT NULL,
      description TEXT NOT NULL,
      auto_create INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused'
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL
    );

    -- Subscriptions
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT,
      account_id TEXT NOT NULL,
      amount REAL NOT NULL,
      billing_frequency TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly', 'quarterly'
      next_billing_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'paused'
      reminder_days_before INTEGER NOT NULL DEFAULT 3,
      icon TEXT NOT NULL DEFAULT 'credit-card',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
    );

    -- Assets
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      asset_type TEXT NOT NULL, -- 'real_estate', 'vehicle', 'gold_jewelry', 'electronics', 'investments', 'business', 'other'
      purchase_price REAL NOT NULL,
      current_value REAL NOT NULL,
      purchase_date TEXT NOT NULL,
      location TEXT,
      family_member_id TEXT,
      notes TEXT,
      documents_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL
    );

    -- Liabilities
    CREATE TABLE IF NOT EXISTS liabilities (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      liability_type TEXT NOT NULL, -- 'mortgage', 'car_loan', 'credit_card_debt', 'personal_loan', 'other'
      original_amount REAL NOT NULL,
      current_balance REAL NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0,
      monthly_payment REAL NOT NULL DEFAULT 0,
      due_date TEXT,
      linked_debt_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (linked_debt_id) REFERENCES debts(id) ON DELETE SET NULL
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'budget_alert', 'bill_due', 'subscription_renewal', 'savings_milestone', 'low_balance', 'system'
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'TRANSFER', 'PAYMENT'
      entity TEXT NOT NULL, -- 'TRANSACTION', 'ACCOUNT', 'BUDGET', 'GOAL', 'DEBT', etc.
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Exchange Rates
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id TEXT PRIMARY KEY,
      base_currency TEXT NOT NULL,
      target_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(base_currency, target_currency)
    );

    -- Indices for performance
    CREATE INDEX IF NOT EXISTS idx_transactions_family_date ON transactions(family_id, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(family_member_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_family ON budgets(family_id);
    CREATE INDEX IF NOT EXISTS idx_savings_goals_family ON savings_goals(family_id);
    CREATE INDEX IF NOT EXISTS idx_debts_family ON debts(family_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_family ON notifications(family_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_audit_family ON audit_logs(family_id);
  `);
}
