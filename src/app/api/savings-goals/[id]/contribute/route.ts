import { NextRequest, NextResponse } from 'next/server';
import { savingsService } from '@/lib/services/savingsService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!body.account_id || !body.amount || !body.date) {
      return NextResponse.json({ success: false, error: 'account_id, amount, and date are required' }, { status: 400 });
    }

    const res = savingsService.addContribution(id, {
      account_id: body.account_id,
      amount: Number(body.amount),
      date: body.date,
      notes: body.notes
    });

    return NextResponse.json({ success: true, data: res });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
