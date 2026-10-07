import { NextRequest, NextResponse } from 'next/server';
import { reportService } from '@/lib/services/reportService';
import { assetLiabilityService } from '@/lib/services/assetLiabilityService';
import { budgetService } from '@/lib/services/budgetService';
import { debtService } from '@/lib/services/debtService';
import { savingsService } from '@/lib/services/savingsService';
import { subscriptionService } from '@/lib/services/subscriptionService';
import { familyService } from '@/lib/services/familyService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const type = searchParams.get('type') || 'all'; // 'income', 'expense', 'cash-flow', 'net-worth', 'budgets', 'all'
    const startDate = searchParams.get('startDate') || `${new Date().getFullYear()}-01-01`;
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    const data: Record<string, unknown> = {};

    if (type === 'all' || type === 'income') {
      data.incomeBreakdown = reportService.getCategoryBreakdown(familyId, startDate, endDate, 'income');
    }
    if (type === 'all' || type === 'expense') {
      data.expenseBreakdown = reportService.getCategoryBreakdown(familyId, startDate, endDate, 'expense');
    }
    if (type === 'all' || type === 'cash-flow') {
      data.cashFlow = reportService.getCashFlowPoints(familyId, startDate, endDate, 'month');
    }
    if (type === 'all' || type === 'net-worth') {
      data.netWorth = assetLiabilityService.getNetWorthSummary(familyId);
    }
    if (type === 'all' || type === 'budgets') {
      data.budgets = budgetService.getBudgets(familyId);
    }
    if (type === 'all') {
      data.debts = debtService.getDebts(familyId);
      data.savings = savingsService.getGoals(familyId);
      data.subscriptions = subscriptionService.getSubscriptions(familyId);
      data.members = familyService.getMembers(familyId);
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
