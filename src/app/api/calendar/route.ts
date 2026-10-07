import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export interface CalendarEvent {
  id: string;
  title: string;
  amount: number;
  date: string;
  type: 'bill' | 'subscription' | 'loan' | 'income' | 'savings_deadline';
  category?: string;
  account?: string;
  status: 'upcoming' | 'paid' | 'expected';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const month = searchParams.get('month') || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const db = getDb();
    const events: CalendarEvent[] = [];

    // 1. Subscriptions due this month
    const subs = db.prepare(`
      SELECT s.id, s.name, s.amount, s.next_billing_date, a.name as account_name
      FROM subscriptions s
      LEFT JOIN accounts a ON s.account_id = a.id
      WHERE s.family_id = ? AND s.status = 'active'
    `).all(familyId) as { id: string; name: string; amount: number; next_billing_date: string; account_name: string }[];

    for (const s of subs) {
      events.push({
        id: `sub-${s.id}`,
        title: `Sub: ${s.name}`,
        amount: s.amount,
        date: s.next_billing_date,
        type: 'subscription',
        account: s.account_name,
        status: 'upcoming'
      });
    }

    // 2. Debts installments due
    const debts = db.prepare(`
      SELECT d.id, d.name, d.installment_amount, d.due_date, d.creditor_debtor
      FROM debts d
      WHERE d.family_id = ? AND d.status = 'active' AND d.installment_amount > 0
    `).all(familyId) as { id: string; name: string; installment_amount: number; due_date: string; creditor_debtor: string }[];

    for (const d of debts) {
      // If due date is far out, project to 15th of the active month
      const eventDate = d.due_date.startsWith(month) ? d.due_date : `${month}-15`;
      events.push({
        id: `debt-${d.id}`,
        title: `Loan: ${d.name}`,
        amount: d.installment_amount,
        date: eventDate,
        type: 'loan',
        category: d.creditor_debtor,
        status: 'upcoming'
      });
    }

    // 3. Expected regular salaries (e.g. 1st and 15th of month)
    events.push({
      id: `salary-1`,
      title: 'Expected Salary (David)',
      amount: 5200.00,
      date: `${month}-01`,
      type: 'income',
      account: 'Chase Premier Checking',
      status: 'expected'
    });
    events.push({
      id: `salary-2`,
      title: 'Expected Salary (Sarah)',
      amount: 4650.00,
      date: `${month}-02`,
      type: 'income',
      account: 'Chase Premier Checking',
      status: 'expected'
    });

    // 4. Savings Goal target dates in this month
    const goals = db.prepare(`
      SELECT id, name, target_amount, target_date
      FROM savings_goals
      WHERE family_id = ? AND status = 'active' AND target_date LIKE ?
    `).all(familyId, `${month}%`) as { id: string; name: string; target_amount: number; target_date: string }[];

    for (const g of goals) {
      events.push({
        id: `goal-${g.id}`,
        title: `Goal Target: ${g.name}`,
        amount: g.target_amount,
        date: g.target_date,
        type: 'savings_deadline',
        status: 'upcoming'
      });
    }

    events.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ success: true, data: events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
