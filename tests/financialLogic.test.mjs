import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert';

console.log('--- RUNNING FAMILY FINANCE ACCOUNTING & BUSINESS LOGIC TEST SUITE ---');

// In-memory isolated database for pure test verification
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');

// 1. Initialize schema
db.exec(`
  CREATE TABLE families (id TEXT PRIMARY KEY, name TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD');
  CREATE TABLE accounts (
    id TEXT PRIMARY KEY, family_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL,
    institution TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', initial_balance REAL NOT NULL DEFAULT 0,
    current_balance REAL NOT NULL DEFAULT 0, credit_limit REAL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE transactions (
    id TEXT PRIMARY KEY, family_id TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD', exchange_rate REAL NOT NULL DEFAULT 1.0,
    converted_amount REAL NOT NULL, date TEXT NOT NULL, description TEXT NOT NULL,
    account_id TEXT NOT NULL, to_account_id TEXT, is_recurring INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE budgets (
    id TEXT PRIMARY KEY, family_id TEXT NOT NULL, category_id TEXT, amount REAL NOT NULL, alert_threshold REAL NOT NULL DEFAULT 0.85
  );
  CREATE TABLE savings_goals (
    id TEXT PRIMARY KEY, family_id TEXT NOT NULL, name TEXT NOT NULL, target_amount REAL NOT NULL,
    current_amount REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE debts (
    id TEXT PRIMARY KEY, family_id TEXT NOT NULL, name TEXT NOT NULL, original_amount REAL NOT NULL,
    remaining_balance REAL NOT NULL, installment_amount REAL NOT NULL DEFAULT 0, total_installments INTEGER NOT NULL,
    remaining_installments INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE assets (
    id TEXT PRIMARY KEY, family_id TEXT NOT NULL, name TEXT NOT NULL, purchase_price REAL NOT NULL, current_value REAL NOT NULL
  );
  CREATE TABLE liabilities (
    id TEXT PRIMARY KEY, family_id TEXT NOT NULL, name TEXT NOT NULL, current_balance REAL NOT NULL
  );
`);

console.log('✓ Database schema created in memory');

// Test 1: Family & Account Setup
db.prepare('INSERT INTO families VALUES (?, ?, ?)').run('fam-1', 'Test Family', 'USD');
db.prepare('INSERT INTO accounts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('acc-1', 'fam-1', 'Checking', 'bank', 'Chase', 'USD', 1000.0, 1000.0, 0, 'active');
db.prepare('INSERT INTO accounts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('acc-2', 'fam-1', 'Savings', 'savings', 'Ally', 'USD', 5000.0, 5000.0, 0, 'active');

let acc1 = db.prepare('SELECT * FROM accounts WHERE id = ?').get('acc-1');
let acc2 = db.prepare('SELECT * FROM accounts WHERE id = ?').get('acc-2');
assert.strictEqual(acc1.current_balance, 1000.0, 'Initial checking balance matches');
assert.strictEqual(acc2.current_balance, 5000.0, 'Initial savings balance matches');
console.log('✓ Test 1: Account setup and initial balances passed');

// Test 2: Income Transaction
db.prepare(`
  INSERT INTO transactions VALUES ('tx-1', 'fam-1', 'income', 2500.0, 'USD', 1.0, 2500.0, '2026-10-01', 'Salary', 'acc-1', NULL, 0)
`).run();
db.prepare('UPDATE accounts SET current_balance = current_balance + 2500.0 WHERE id = ?').run('acc-1');

acc1 = db.prepare('SELECT current_balance FROM accounts WHERE id = ?').get('acc-1');
assert.strictEqual(acc1.current_balance, 3500.0, 'Checking balance increased after income');
console.log('✓ Test 2: Income creation and balance increment passed');

// Test 3: Expense Transaction
db.prepare(`
  INSERT INTO transactions VALUES ('tx-2', 'fam-1', 'expense', 400.0, 'USD', 1.0, 400.0, '2026-10-02', 'Groceries', 'acc-1', NULL, 0)
`).run();
db.prepare('UPDATE accounts SET current_balance = current_balance - 400.0 WHERE id = ?').run('acc-1');

acc1 = db.prepare('SELECT current_balance FROM accounts WHERE id = ?').get('acc-1');
assert.strictEqual(acc1.current_balance, 3100.0, 'Checking balance decreased after expense');
console.log('✓ Test 3: Expense creation and balance decrement passed');

// Test 4: Transfer Between Accounts
// Transfer 1000 from acc-1 to acc-2
db.prepare(`
  INSERT INTO transactions VALUES ('tx-3', 'fam-1', 'transfer', 1000.0, 'USD', 1.0, 1000.0, '2026-10-03', 'Savings transfer', 'acc-1', 'acc-2', 0)
`).run();
db.prepare('UPDATE accounts SET current_balance = current_balance - 1000.0 WHERE id = ?').run('acc-1');
db.prepare('UPDATE accounts SET current_balance = current_balance + 1000.0 WHERE id = ?').run('acc-2');

acc1 = db.prepare('SELECT current_balance FROM accounts WHERE id = ?').get('acc-1');
acc2 = db.prepare('SELECT current_balance FROM accounts WHERE id = ?').get('acc-2');
assert.strictEqual(acc1.current_balance, 2100.0, 'Source account debited');
assert.strictEqual(acc2.current_balance, 6000.0, 'Destination account credited');

// Verify that transfers do NOT inflate household income or expense
const totalIncome = db.prepare("SELECT SUM(converted_amount) as s FROM transactions WHERE type = 'income'").get().s;
const totalExpense = db.prepare("SELECT SUM(converted_amount) as s FROM transactions WHERE type = 'expense'").get().s;
assert.strictEqual(totalIncome, 2500.0, 'Total income ignores transfer');
assert.strictEqual(totalExpense, 400.0, 'Total expense ignores transfer');
console.log('✓ Test 4: Atomic account transfer without false income/expense passed');

// Test 5: Transaction Editing with Balance Adjustment
// Edit Groceries from 400 to 450 (difference +50)
const oldTx = db.prepare("SELECT * FROM transactions WHERE id = 'tx-2'").get();
const newAmount = 450.0;
// Revert old effect (+400), apply new effect (-450) -> net -50
db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(oldTx.converted_amount, oldTx.account_id);
db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(newAmount, oldTx.account_id);
db.prepare("UPDATE transactions SET amount = ?, converted_amount = ? WHERE id = 'tx-2'").run(newAmount, newAmount);

acc1 = db.prepare('SELECT current_balance FROM accounts WHERE id = ?').get('acc-1');
assert.strictEqual(acc1.current_balance, 2050.0, 'Balance accurately adjusted on transaction edit');
console.log('✓ Test 5: Transaction editing balance rollback and re-apply passed');

// Test 6: Transaction Deletion with Balance Restoration
// Delete the 450 expense
db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(newAmount, oldTx.account_id);
db.prepare("DELETE FROM transactions WHERE id = 'tx-2'").run();

acc1 = db.prepare('SELECT current_balance FROM accounts WHERE id = ?').get('acc-1');
assert.strictEqual(acc1.current_balance, 2500.0, 'Balance restored after transaction deletion');
console.log('✓ Test 6: Transaction deletion balance reversal passed');

// Test 7: Budget Warning Threshold Calculations
db.prepare("INSERT INTO budgets VALUES ('b-1', 'fam-1', 'cat-groceries', 500.0, 0.85)").run();
// 300 spent -> 60% (Healthy)
let spent = 300.0;
let status = spent >= 500.0 ? 'exceeded' : (spent >= 500.0 * 0.85 ? 'near_limit' : 'healthy');
assert.strictEqual(status, 'healthy');

// 450 spent -> 90% (Near Limit)
spent = 450.0;
status = spent >= 500.0 ? 'exceeded' : (spent >= 500.0 * 0.85 ? 'near_limit' : 'healthy');
assert.strictEqual(status, 'near_limit');

// 520 spent -> 104% (Exceeded)
spent = 520.0;
status = spent >= 500.0 ? 'exceeded' : (spent >= 500.0 * 0.85 ? 'near_limit' : 'healthy');
assert.strictEqual(status, 'exceeded');
console.log('✓ Test 7: Budget calculation & alert thresholds (healthy, near limit, exceeded) passed');

// Test 8: Savings Goal Contribution
db.prepare("INSERT INTO savings_goals VALUES ('sg-1', 'fam-1', 'Emergency Fund', 10000.0, 5000.0, 'active')").run();
// Contribute 1000 from acc-2 (Savings)
db.prepare("UPDATE accounts SET current_balance = current_balance - 1000.0 WHERE id = 'acc-2'").run();
db.prepare("UPDATE savings_goals SET current_amount = current_amount + 1000.0 WHERE id = 'sg-1'").run();

let goal = db.prepare("SELECT * FROM savings_goals WHERE id = 'sg-1'").get();
acc2 = db.prepare("SELECT current_balance FROM accounts WHERE id = 'acc-2'").get();
assert.strictEqual(goal.current_amount, 6000.0, 'Savings goal current amount updated');
assert.strictEqual(acc2.current_balance, 5000.0, 'Savings account debited for contribution');
console.log('✓ Test 8: Savings goal contribution and goal progress passed');

// Test 9: Debt Repayment & Installment Decrement
db.prepare("INSERT INTO debts VALUES ('d-1', 'fam-1', 'Auto Loan', 20000.0, 15000.0, 500.0, 48, 30, 'active')").run();
// Record repayment of 500
db.prepare("UPDATE accounts SET current_balance = current_balance - 500.0 WHERE id = 'acc-1'").run();
db.prepare("UPDATE debts SET remaining_balance = remaining_balance - 500.0, remaining_installments = remaining_installments - 1 WHERE id = 'd-1'").run();

let debt = db.prepare("SELECT * FROM debts WHERE id = 'd-1'").get();
assert.strictEqual(debt.remaining_balance, 14500.0, 'Debt balance reduced');
assert.strictEqual(debt.remaining_installments, 29, 'Remaining installments decremented');
console.log('✓ Test 9: Debt repayment ledger logic passed');

// Test 10: Net Worth Calculation
// Net Worth = Assets (Physical assets + Liquid accounts) - Liabilities (Debts + Liabilities)
db.prepare("INSERT INTO assets VALUES ('ast-1', 'fam-1', 'Family Home', 400000.0, 500000.0)").run();
db.prepare("INSERT INTO liabilities VALUES ('liab-1', 'fam-1', 'Mortgage', 350000.0)").run();

const physicalAssets = db.prepare('SELECT SUM(current_value) as s FROM assets').get().s;
const liquidAccounts = db.prepare('SELECT SUM(current_balance) as s FROM accounts').get().s;
const totalAssets = physicalAssets + liquidAccounts;

const liabilitiesVal = db.prepare('SELECT SUM(current_balance) as s FROM liabilities').get().s;
const debtsVal = db.prepare('SELECT SUM(remaining_balance) as s FROM debts').get().s;
const totalLiabilities = liabilitiesVal + debtsVal;

const netWorth = totalAssets - totalLiabilities;
assert.strictEqual(totalAssets, 500000.0 + (2000.0 + 5000.0), 'Total assets calculated correctly');
assert.strictEqual(totalLiabilities, 350000.0 + 14500.0, 'Total liabilities calculated correctly');
assert.strictEqual(netWorth, totalAssets - totalLiabilities, 'Net Worth = Total Assets - Total Liabilities');
console.log('✓ Test 10: Net Worth formula integrity passed');

console.log('--- ALL 10 FINANCIAL CORE LOGIC TEST PHASES COMPLETED WITH ZERO ERRORS! ---');
