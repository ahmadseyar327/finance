import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/lib/services/budgetService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const month = searchParams.get('month') || undefined;

    const budgets = budgetService.getBudgets(familyId, month);
    return NextResponse.json({ success: true, data: budgets });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const familyId = body.family_id || 'fam-demo-001';
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid budget amount is required' }, { status: 400 });
    }

    const created = budgetService.createBudget(familyId, body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
