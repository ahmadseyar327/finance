import { getDb } from '@/lib/db';
import { budgetService } from './budgetService';
import { savingsService } from './savingsService';
import { debtService } from './debtService';
import { assetLiabilityService } from './assetLiabilityService';

export interface CashFlowPoint {
  date: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MemberBreakdown {
  id: string;
  name: string;
  avatar_color: string;
  relationship: string;
  income: number;
  expenses: number;
  net: number;
}

export interface FinancialHealthScore {
  score: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  savingsRate: number;
  expenseToIncomeRatio: number;
  debtToIncomeRatio: number;
  budgetAdherenceScore: number;
  emergencyFundStatus: string;
  insights: string[];
}

export const reportService = {
  getDashboardData(familyId: string, period: '7d' | '30d' | 'month' | 'last_month' | '6m' | '12m' = 'month') {
    const db = getDb();
    const today = new Date();

    // Determine start and end dates
    let startDate: string;
    let endDate: string = today.toISOString().split('T')[0];

    if (period === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString().split('T')[0];
    } else if (period === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString().split('T')[0];
    } else if (period === 'last_month') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      startDate = first.toISOString().split('T')[0];
      endDate = last.toISOString().split('T')[0];
    } else if (period === '6m') {
      const d = new Date(today.getFullYear(), today.getMonth() - 6, 1);
      startDate = d.toISOString().split('T')[0];
    } else if (period === '12m') {
      const d = new Date(today.getFullYear() - 1, today.getMonth(), 1);
      startDate = d.toISOString().split('T')[0];
    } else {
      // Current Month
      startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    }

    // 1. Total Balance across all non-credit-card accounts
    const accBalRow = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type != 'credit_card' THEN current_balance ELSE 0 END), 0) as liquid_balance,
        COALESCE(SUM(CASE WHEN type = 'credit_card' AND current_balance > 0 THEN current_balance ELSE 0 END), 0) as card_debt
      FROM accounts
      WHERE family_id = ? AND status = 'active'
    `).get(familyId) as { liquid_balance: number; card_debt: number };
    const totalBalance = Number(accBalRow.liquid_balance.toFixed(2));

    // 2. Current Period Income & Expenses
    const currentTxs = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN converted_amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END), 0) as total_expenses
      FROM transactions
      WHERE family_id = ? AND date >= ? AND date <= ?
    `).get(familyId, startDate, endDate) as { total_income: number; total_expenses: number };

    const totalIncome = Number(currentTxs.total_income.toFixed(2));
    const totalExpenses = Number(currentTxs.total_expenses.toFixed(2));
    const netCashFlow = Number((totalIncome - totalExpenses).toFixed(2));

    // 3. Previous Period for comparison & percentage deltas
    const periodDays = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
    const prevEnd = new Date(new Date(startDate).getTime() - (1000 * 60 * 60 * 24)).toISOString().split('T')[0];
    const prevStart = new Date(new Date(prevEnd).getTime() - (periodDays * 1000 * 60 * 60 * 24)).toISOString().split('T')[0];

    const prevTxs = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN converted_amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END), 0) as total_expenses
      FROM transactions
      WHERE family_id = ? AND date >= ? AND date <= ?
    `).get(familyId, prevStart, prevEnd) as { total_income: number; total_expenses: number };

    const prevIncome = Number(prevTxs.total_income.toFixed(2));
    const prevExpenses = Number(prevTxs.total_expenses.toFixed(2));
    const prevNet = Number((prevIncome - prevExpenses).toFixed(2));

    const incomeDeltaPct = prevIncome > 0 ? Number((((totalIncome - prevIncome) / prevIncome) * 100).toFixed(1)) : 0;
    const expenseDeltaPct = prevExpenses > 0 ? Number((((totalExpenses - prevExpenses) / prevExpenses) * 100).toFixed(1)) : 0;
    const netDeltaPct = prevNet !== 0 ? Number((((netCashFlow - prevNet) / Math.abs(prevNet)) * 100).toFixed(1)) : 0;

    // 4. Total Savings from goals
    const goals = savingsService.getGoals(familyId);
    const totalSavings = goals.reduce((sum, g) => sum + g.current_amount, 0);

    // 5. Total Debt
    const debts = debtService.getDebts(familyId);
    const totalDebt = Number((debts.reduce((sum, d) => sum + d.remaining_balance, 0) + accBalRow.card_debt).toFixed(2));

    // 6. Net Worth
    const netWorthData = assetLiabilityService.getNetWorthSummary(familyId);

    // 7. Cash Flow Points for chart
    const cashFlowPoints = this.getCashFlowPoints(familyId, startDate, endDate, period);

    // 8. Expense Breakdown by Category
    const expenseCategories = this.getCategoryBreakdown(familyId, startDate, endDate, 'expense');

    // 9. Income Breakdown by Category
    const incomeCategories = this.getCategoryBreakdown(familyId, startDate, endDate, 'income');

    // 10. Budgets overview
    const budgets = budgetService.getBudgets(familyId);
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalBudgetSpent = budgets.reduce((s, b) => s + b.spent, 0);
    const exceedingBudgets = budgets.filter((b) => b.status === 'exceeded');

    // 11. Upcoming payments (Subscriptions + Debts dues)
    const upcomingPayments = this.getUpcomingPayments(familyId);

    // 12. Recent transactions (latest 8)
    const recentTransactions = db.prepare(`
      SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        a.name as account_name,
        m.name as member_name,
        m.avatar_color as member_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN family_members m ON t.family_member_id = m.id
      WHERE t.family_id = ?
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 8
    `).all(familyId);

    // 13. System Financial Health indicator
    const health = this.calculateFinancialHealth(totalIncome, totalExpenses, totalDebt, totalSavings, budgets);

    return {
      period,
      startDate,
      endDate,
      summary: {
        totalBalance,
        totalIncome,
        totalExpenses,
        netCashFlow,
        totalSavings,
        totalDebt,
        netWorth: netWorthData.netWorth,
        incomeDeltaPct,
        expenseDeltaPct,
        netDeltaPct
      },
      cashFlowPoints,
      expenseCategories,
      incomeCategories,
      budgetOverview: {
        totalBudget,
        totalSpent: totalBudgetSpent,
        remaining: Math.max(0, totalBudget - totalBudgetSpent),
        percentageUsed: totalBudget > 0 ? Number(((totalBudgetSpent / totalBudget) * 100).toFixed(1)) : 0,
        exceedingCount: exceedingBudgets.length,
        items: budgets.slice(0, 5)
      },
      savingsGoals: goals.slice(0, 4),
      upcomingPayments,
      recentTransactions,
      financialHealth: health,
      netWorthTrend: netWorthData.historicalTrend
    };
  },

  getCashFlowPoints(familyId: string, startDate: string, endDate: string, period: string): CashFlowPoint[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        date,
        COALESCE(SUM(CASE WHEN type = 'income' THEN converted_amount ELSE 0 END), 0) as inc,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END), 0) as exp
      FROM transactions
      WHERE family_id = ? AND date >= ? AND date <= ?
      GROUP BY date
      ORDER BY date ASC
    `).all(familyId, startDate, endDate) as { date: string; inc: number; exp: number }[];

    if (period === '6m' || period === '12m') {
      // Group by month
      const monthMap = new Map<string, { income: number; expenses: number }>();
      for (const r of rows) {
        const mKey = r.date.substring(0, 7); // YYYY-MM
        const curr = monthMap.get(mKey) || { income: 0, expenses: 0 };
        curr.income += r.inc;
        curr.expenses += r.exp;
        monthMap.set(mKey, curr);
      }
      return Array.from(monthMap.entries()).map(([mKey, val]) => {
        const d = new Date(`${mKey}-01`);
        const label = d.toLocaleString('default', { month: 'short' });
        return {
          date: mKey,
          label,
          income: Number(val.income.toFixed(2)),
          expenses: Number(val.expenses.toFixed(2)),
          net: Number((val.income - val.expenses).toFixed(2))
        };
      });
    }

    return rows.map((r) => {
      const d = new Date(r.date);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      return {
        date: r.date,
        label,
        income: Number(r.inc.toFixed(2)),
        expenses: Number(r.exp.toFixed(2)),
        net: Number((r.inc - r.exp).toFixed(2))
      };
    });
  },

  getCategoryBreakdown(familyId: string, startDate: string, endDate: string, type: 'expense' | 'income'): CategoryBreakdown[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        c.id,
        COALESCE(c.name, 'Uncategorized') as name,
        COALESCE(c.color, '#6B7280') as color,
        COALESCE(c.icon, 'tag') as icon,
        SUM(t.converted_amount) as amount,
        COUNT(t.id) as tx_count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.family_id = ? AND t.type = ? AND t.date >= ? AND t.date <= ?
      GROUP BY c.id
      ORDER BY amount DESC
    `).all(familyId, type, startDate, endDate) as { id: string; name: string; color: string; icon: string; amount: number; tx_count: number }[];

    const total = rows.reduce((s, r) => s + r.amount, 0);

    return rows.map((r) => ({
      id: r.id || 'uncategorized',
      name: r.name,
      color: r.color,
      icon: r.icon,
      amount: Number(r.amount.toFixed(2)),
      percentage: total > 0 ? Number(((r.amount / total) * 100).toFixed(1)) : 0,
      transactionCount: r.tx_count
    }));
  },

  getUpcomingPayments(familyId: string) {
    const db = getDb();
    // 1. Subscriptions upcoming
    const subs = db.prepare(`
      SELECT 
        id, name, amount, next_billing_date as due_date, 'subscription' as payment_type, icon
      FROM subscriptions
      WHERE family_id = ? AND status = 'active'
      ORDER BY next_billing_date ASC
      LIMIT 5
    `).all(familyId) as { id: string; name: string; amount: number; due_date: string; payment_type: string; icon: string }[];

    // 2. Debts upcoming
    const debts = db.prepare(`
      SELECT 
        id, name, installment_amount as amount, due_date, 'loan' as payment_type, 'landmark' as icon
      FROM debts
      WHERE family_id = ? AND status = 'active' AND installment_amount > 0
      ORDER BY due_date ASC
      LIMIT 5
    `).all(familyId) as { id: string; name: string; amount: number; due_date: string; payment_type: string; icon: string }[];

    const combined = [...subs, ...debts].sort((a, b) => a.due_date.localeCompare(b.due_date));
    return combined.slice(0, 6);
  },

  calculateFinancialHealth(
    income: number,
    expenses: number,
    totalDebt: number,
    totalSavings: number,
    budgets: { spent: number; amount: number }[]
  ): FinancialHealthScore {
    // 1. Savings rate
    const savingsRate = income > 0 ? Math.max(0, Number((((income - expenses) / income) * 100).toFixed(1))) : 0;
    // 2. Expense to income ratio
    const expenseToIncomeRatio = income > 0 ? Number(((expenses / income) * 100).toFixed(1)) : 100;
    // 3. Debt to income ratio (monthly estimates)
    const debtToIncomeRatio = income > 0 ? Number(((totalDebt / (income * 12)) * 100).toFixed(1)) : 0;

    // 4. Budget adherence
    let overBudgetCount = 0;
    for (const b of budgets) {
      if (b.spent > b.amount) overBudgetCount++;
    }
    const budgetAdherenceScore = budgets.length > 0 ? Math.max(0, 100 - (overBudgetCount * 25)) : 90;

    // Calculate composite score (0-100)
    let score = 50;
    if (savingsRate >= 20) score += 20;
    else if (savingsRate >= 10) score += 10;

    if (expenseToIncomeRatio <= 70) score += 15;
    else if (expenseToIncomeRatio <= 85) score += 8;

    if (budgetAdherenceScore >= 80) score += 10;
    if (totalSavings >= expenses * 3) score += 10; // Emergency fund > 3 months expenses

    if (debtToIncomeRatio > 40) score -= 15;
    else if (debtToIncomeRatio > 25) score -= 5;

    score = Math.min(100, Math.max(10, score));

    let rating: FinancialHealthScore['rating'] = 'Good';
    if (score >= 85) rating = 'Excellent';
    else if (score >= 70) rating = 'Good';
    else if (score >= 55) rating = 'Fair';
    else rating = 'Needs Attention';

    const insights: string[] = [];
    if (savingsRate >= 20) {
      insights.push(`Strong savings rate of ${savingsRate}% exceeds the recommended 20% benchmark.`);
    } else {
      insights.push(`Savings rate is ${savingsRate}%. Aim for at least 15-20% to build security.`);
    }

    if (overBudgetCount === 0 && budgets.length > 0) {
      insights.push('All family budgets are within established limits this period.');
    } else if (overBudgetCount > 0) {
      insights.push(`${overBudgetCount} budget categories have exceeded their monthly thresholds.`);
    }

    if (totalSavings >= expenses * 3) {
      insights.push('Emergency fund covers over 3 months of typical household expenses.');
    }

    return {
      score,
      rating,
      savingsRate,
      expenseToIncomeRatio,
      debtToIncomeRatio,
      budgetAdherenceScore,
      emergencyFundStatus: totalSavings >= expenses * 3 ? 'Sufficient (3+ Months)' : 'Building (Under 3 Months)',
      insights
    };
  }
};
