import { NextRequest, NextResponse } from 'next/server';
import { debtService } from '@/lib/services/debtService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!body.account_id || !body.amount || !body.payment_date) {
      return NextResponse.json({ success: false, error: 'account_id, amount, and payment_date are required' }, { status: 400 });
    }

    const res = debtService.recordPayment(id, {
      account_id: body.account_id,
      amount: Number(body.amount),
      principal_amount: body.principal_amount ? Number(body.principal_amount) : undefined,
      interest_amount: body.interest_amount ? Number(body.interest_amount) : undefined,
      payment_date: body.payment_date,
      notes: body.notes,
      family_member_id: body.family_member_id
    });

    return NextResponse.json({ success: true, data: res });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
