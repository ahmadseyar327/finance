import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { auditService } from './auditService';
import { transactionService } from './transactionService';

export interface Debt {
  id: string;
  family_id: string;
  name: string;
  type: 'personal_loan' | 'bank_loan' | 'mortgage' | 'credit_card' | 'lent_to_other' | 'borrowed_from_family';
  creditor_debtor: string;
  original_amount: number;
  remaining_balance: number;
  interest_rate: number;
  start_date: string;
  due_date: string;
  installment_amount: number;
  payment_frequency: 'monthly' | 'weekly' | 'biweekly' | 'quarterly';
  total_installments: number;
  remaining_installments: number;
  notes?: string;
  status: 'active' | 'paid_off';
  created_at: string;
  updated_at: string;
  // Computed
  paid_amount: number;
  payoff_progress: number;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  account_id: string;
  account_name?: string;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export const debtService = {
  getDebts(familyId: string): Debt[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM debts
      WHERE family_id = ?
      ORDER BY 
        CASE status WHEN 'active' THEN 1 ELSE 2 END,
        due_date ASC
    `).all(familyId) as Debt[];

    return rows.map((d) => {
      const paid = Math.max(0, Number((d.original_amount - d.remaining_balance).toFixed(2)));
      const progress = d.original_amount > 0 ? Math.min(100, Number(((paid / d.original_amount) * 100).toFixed(1))) : 0;
      return {
        ...d,
        paid_amount: paid,
        payoff_progress: progress
      };
    });
  },

  getDebtById(id: string): Debt | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM debts WHERE id = ?').get(id) as Debt | undefined;
    if (!row) return null;
    const paid = Math.max(0, Number((row.original_amount - row.remaining_balance).toFixed(2)));
    const progress = row.original_amount > 0 ? Math.min(100, Number(((paid / row.original_amount) * 100).toFixed(1))) : 0;
    return {
      ...row,
      paid_amount: paid,
      payoff_progress: progress
    };
  },

  createDebt(familyId: string, data: {
    name: string;
    type: Debt['type'];
    creditor_debtor: string;
    original_amount: number;
    remaining_balance?: number;
    interest_rate?: number;
    start_date: string;
    due_date: string;
    installment_amount?: number;
    payment_frequency?: Debt['payment_frequency'];
    total_installments?: number;
    notes?: string;
  }): Debt {
    const db = getDb();
    const id = crypto.randomUUID();
    const remaining = data.remaining_balance !== undefined ? data.remaining_balance : data.original_amount;
    const installments = data.total_installments || 12;

    db.prepare(`
      INSERT INTO debts (
        id, family_id, name, type, creditor_debtor, original_amount,
        remaining_balance, interest_rate, start_date, due_date,
        installment_amount, payment_frequency, total_installments,
        remaining_installments, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      id,
      familyId,
      data.name,
      data.type,
      data.creditor_debtor,
      data.original_amount,
      remaining,
      data.interest_rate || 0,
      data.start_date,
      data.due_date,
      data.installment_amount || 0,
      data.payment_frequency || 'monthly',
      installments,
      installments,
      data.notes || null
    );

    auditService.log(familyId, 'CREATE', 'DEBT', id, { name: data.name, original_amount: data.original_amount });
    return this.getDebtById(id)!;
  },

  recordPayment(debtId: string, data: {
    account_id: string;
    amount: number;
    principal_amount?: number;
    interest_amount?: number;
    payment_date: string;
    notes?: string;
    createTransaction?: boolean;
    family_member_id?: string;
  }): { paymentId: string; remainingBalance: number; status: string } {
    const db = getDb();
    const debt = this.getDebtById(debtId);
    if (!debt) throw new Error('Debt record not found');
    if (data.amount <= 0) throw new Error('Payment amount must be greater than zero');

    const paymentId = crypto.randomUUID();
    const principal = data.principal_amount !== undefined ? data.principal_amount : data.amount;
    const interest = data.interest_amount || 0;
    const newBalance = Math.max(0, Number((debt.remaining_balance - principal).toFixed(2)));
    const newStatus = newBalance === 0 ? 'paid_off' : 'active';
    const newRemainingInstallments = Math.max(0, debt.remaining_installments - 1);

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Record debt payment
      db.prepare(`
        INSERT INTO debt_payments (
          id, debt_id, account_id, amount, principal_amount, interest_amount, payment_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(paymentId, debtId, data.account_id, data.amount, principal, interest, data.payment_date, data.notes || null);

      // 2. Update debt record
      db.prepare(`
        UPDATE debts
        SET remaining_balance = ?,
            remaining_installments = ?,
            status = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(newBalance, newRemainingInstallments, newStatus, debtId);

      // 3. Create expense transaction for the family ledger
      if (data.createTransaction !== false) {
        // Find or fallback category
        const debtCat = db.prepare("SELECT id FROM categories WHERE family_id = ? AND name LIKE '%Debt%' LIMIT 1").get(debt.family_id) as { id: string } | undefined;
        
        transactionService.createTransaction({
          family_id: debt.family_id,
          type: 'expense',
          amount: data.amount,
          date: data.payment_date,
          description: `Debt Payment: ${debt.name} (${debt.creditor_debtor})`,
          account_id: data.account_id,
          category_id: debtCat?.id,
          family_member_id: data.family_member_id,
          payment_method: 'Bank Transfer',
          notes: `Principal: $${principal}, Interest: $${interest}. ${data.notes || ''}`
        });
      }

      db.exec('COMMIT;');

      auditService.log(debt.family_id, 'PAYMENT', 'DEBT', debtId, {
        amount: data.amount,
        principal,
        remainingBalance: newBalance,
        status: newStatus
      });

      return { paymentId, remainingBalance: newBalance, status: newStatus };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  getPayments(debtId: string): DebtPayment[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT p.*, a.name as account_name
      FROM debt_payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE p.debt_id = ?
      ORDER BY p.payment_date DESC
    `).all(debtId) as (DebtPayment & { account_name?: string })[];
    return rows;
  },

  deleteDebt(id: string): boolean {
    const db = getDb();
    const existing = this.getDebtById(id);
    if (!existing) return false;

    db.prepare('DELETE FROM debts WHERE id = ?').run(id);
    auditService.log(existing.family_id, 'DELETE', 'DEBT', id, { name: existing.name });
    return true;
  }
};
