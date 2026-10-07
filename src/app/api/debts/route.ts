import { NextRequest, NextResponse } from 'next/server';
import { debtService } from '@/lib/services/debtService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const debts = debtService.getDebts(familyId);
    return NextResponse.json({ success: true, data: debts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const familyId = body.family_id || 'fam-demo-001';
    if (!body.name || !body.type || !body.creditor_debtor || !body.original_amount || !body.due_date) {
      return NextResponse.json({ success: false, error: 'Name, type, creditor_debtor, original_amount, due_date are required' }, { status: 400 });
    }

    const created = debtService.createDebt(familyId, body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
